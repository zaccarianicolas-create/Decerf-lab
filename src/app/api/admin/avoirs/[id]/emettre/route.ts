import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBillitAdmin } from "@/lib/billit-admin";
import {
  createBillitCreditNote,
  downloadBillitOrderPdf,
  getBillitConfig,
  getBillitOrderStatus,
  formatBillitDateInBrussels,
  sendBillitOrder,
} from "@/lib/billit";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const admin = createAdminClient();
  const { id } = await params;
  const { data: avoir, error: avoirError } = await admin
    .from("avoirs")
    .select("id, numero, statut, motif, montant, facture_id, billit_order_id")
    .eq("id", id)
    .maybeSingle();
  if (avoirError || !avoir) {
    return NextResponse.json({ error: avoirError?.message || "Avoir introuvable." }, { status: 404 });
  }
  if (["valide", "impute"].includes(avoir.statut)) {
    return NextResponse.json({ success: true, already_emitted: true, avoir_id: avoir.id });
  }
  if (avoir.statut !== "brouillon" || !avoir.facture_id) {
    return NextResponse.json({ error: "Seul un brouillon lié à une facture peut être émis." }, { status: 409 });
  }

  const { data: facture, error: factureError } = await admin
    .from("factures")
    .select("id, numero, statut, montant_ttc, solde_du, date_echeance, billit_order_id, billing_snapshot")
    .eq("id", avoir.facture_id)
    .maybeSingle();
  if (factureError || !facture) {
    return NextResponse.json({ error: factureError?.message || "Facture d’origine introuvable." }, { status: 404 });
  }
  if (!facture.billit_order_id || ["brouillon", "annulee"].includes(facture.statut)) {
    return NextResponse.json({ error: "La facture d’origine doit déjà être émise par Billit." }, { status: 409 });
  }

  try {
    const config = getBillitConfig();
    if (config.environment !== "production" || process.env.BILLIT_SEND_REAL_INVOICES !== "true") {
      return NextResponse.json({ error: "L’émission réelle d’avoirs est verrouillée jusqu’à l’activation explicite de Billit Production." }, { status: 409 });
    }

    const originalStatus = await getBillitOrderStatus(admin, Number(facture.billit_order_id));
    if (originalStatus.orderNumber !== facture.numero || !originalStatus.isSent) {
      return NextResponse.json({ error: "La facture Billit d’origine doit être envoyée et correspondre au numéro Decerf." }, { status: 409 });
    }

    let billitOrderId = avoir.billit_order_id ? Number(avoir.billit_order_id) : null;
    if (!billitOrderId) {
      const { data: lines, error: linesError } = await admin
        .from("facture_lignes")
        .select("description, quantite, prix_unitaire, taux_tva, categorie_tva_peppol")
        .eq("facture_id", facture.id)
        .order("created_at");
      if (linesError || !lines?.length) {
        return NextResponse.json({ error: linesError?.message || "Lignes de facture introuvables." }, { status: 409 });
      }

      const created = await createBillitCreditNote(admin, {
        numero: avoir.numero,
        dateEmission: formatBillitDateInBrussels(new Date()),
        dateEcheance: facture.date_echeance || formatBillitDateInBrussels(new Date()),
        factureOriginale: facture.numero,
        snapshot: facture.billing_snapshot as unknown as FactureBillingSnapshot,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantite),
          unitPriceExcl: Number(line.prix_unitaire),
          vatPercent: Number(line.taux_tva),
          vatCategory: line.categorie_tva_peppol as "S" | "Z" | "E" | undefined,
        })),
      });
      billitOrderId = created.orderId;
      const { error: saveOrderError } = await admin.from("avoirs").update({
        billit_order_id: billitOrderId,
        billit_order_status: "ToSend",
        billit_last_error: null,
      }).eq("id", avoir.id);
      if (saveOrderError) {
        return NextResponse.json({ error: "L’avoir a été créé chez Billit, mais son identifiant n’a pas pu être enregistré localement. Ne relance pas avant vérification dans Billit." }, { status: 500 });
      }
    }

    let status = await getBillitOrderStatus(admin, billitOrderId);
    if (!status.isSent) {
      try {
        await sendBillitOrder(admin, billitOrderId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Envoi Billit impossible.";
        await admin.from("avoirs").update({
          billit_order_status: status.orderStatus,
          billit_delivery_status: status.deliveryStatus,
          billit_last_error: reason,
        }).eq("id", avoir.id);
        return NextResponse.json({ error: reason, billit_order_id: billitOrderId }, { status: 502 });
      }
      status = await getBillitOrderStatus(admin, billitOrderId);
    }

    if (!status.isSent) {
      await admin.from("avoirs").update({
        billit_order_status: status.orderStatus,
        billit_delivery_status: status.deliveryStatus,
        billit_is_sent: false,
        billit_is_delivered: status.delivered,
        billit_last_error: null,
        billit_synced_at: new Date().toISOString(),
      }).eq("id", avoir.id);
      return NextResponse.json({ error: "Billit n’a pas encore confirmé l’envoi de l’avoir. Le brouillon peut être actualisé sans recréer de note.", billit_order_id: billitOrderId }, { status: 202 });
    }

    const pdf = await downloadBillitOrderPdf(admin, billitOrderId);
    const storagePath = `billit/avoirs/${avoir.id}/${pdf.fileName}`;
    const { error: uploadError } = await admin.storage.from("factures").upload(storagePath, pdf.bytes, {
      contentType: pdf.mimeType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (uploadError) throw new Error(`L’avoir est envoyé par Billit mais son PDF n’a pas pu être archivé : ${uploadError.message}`);

    const { error: saveError } = await admin.from("avoirs").update({
      billit_order_status: status.orderStatus,
      billit_delivery_status: status.deliveryStatus,
      billit_is_sent: true,
      billit_is_delivered: status.delivered,
      billit_pdf_storage_path: storagePath,
      billit_last_error: null,
      billit_synced_at: new Date().toISOString(),
    }).eq("id", avoir.id);
    if (saveError) throw new Error(`L’avoir est envoyé par Billit, mais la synchronisation locale a échoué : ${saveError.message}`);

    const { data: finalized, error: finalizeError } = await admin.rpc("finaliser_avoir_billit", {
      p_avoir_id: avoir.id,
      p_admin_id: auth.userId,
    });
    if (finalizeError) throw new Error(`L’avoir est envoyé par Billit mais son imputation locale a échoué : ${finalizeError.message}`);

    return NextResponse.json({
      success: true,
      avoir_id: avoir.id,
      billit_order_id: billitOrderId,
      order_status: status.orderStatus,
      delivery_status: status.deliveryStatus,
      delivered: status.delivered,
      finalized: finalized?.already_finalized !== true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Émission Billit de l’avoir impossible.";
    await admin.from("avoirs").update({ billit_last_error: message }).eq("id", avoir.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
