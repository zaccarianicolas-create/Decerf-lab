import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createFacturePdf } from "@/lib/facture-pdf";
import type { FactureBillingSnapshot } from "@/lib/facture-workflow";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const selectedOptions: unknown = body.selected_options;
  if (
    !Array.isArray(selectedOptions) ||
    selectedOptions.some((selection) =>
      !selection ||
      typeof selection !== "object" ||
      typeof selection.commande_item_id !== "string" ||
      typeof selection.service_option_id !== "string"
    )
  ) {
    return NextResponse.json({ error: "Sélection d’options invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: facture, error: factureError } = await admin
    .from("factures")
    .select("id, numero, statut, dentiste_id, montant_ht, montant_tva, montant_ttc, solde_du, date_emission, date_echeance, billing_snapshot, pdf_storage_path, email_envoye_at")
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .maybeSingle();
  if (factureError || !facture) {
    return NextResponse.json({ error: factureError?.message || "Facture introuvable." }, { status: 404 });
  }

  const { data: validation, error: validationError } = await admin.rpc(
    "valider_facture_brouillon",
    {
      p_facture_id: facture.id,
      p_actor_id: user.id,
      p_selected_options: selectedOptions,
      p_methode_paiement: "virement",
    }
  );
  if (validationError) {
    return NextResponse.json({ error: validationError.message }, { status: 400 });
  }

  const [{ data: updatedFacture, error: updatedError }, { data: lines, error: linesError }] = await Promise.all([
    admin
      .from("factures")
      .select("id, numero, statut, montant_ht, montant_tva, montant_ttc, solde_du, date_emission, date_echeance, billing_snapshot, pdf_storage_path, email_envoye_at")
      .eq("id", facture.id)
      .single(),
    admin
      .from("facture_lignes")
      .select("description, quantite, prix_unitaire, taux_tva, categorie_tva_peppol, motif_exoneration_tva, total_ligne_ht, total_ligne_tva, total_ligne_ttc")
      .eq("facture_id", facture.id)
      .order("created_at"),
  ]);
  if (updatedError || linesError || !updatedFacture || !lines) {
    return NextResponse.json({ error: updatedError?.message || linesError?.message || "Facture introuvable." }, { status: 500 });
  }

  const snapshot = updatedFacture.billing_snapshot as unknown as FactureBillingSnapshot;
  const bytes = await createFacturePdf({
    numero: updatedFacture.numero,
    date_emission: updatedFacture.date_emission,
    date_echeance: updatedFacture.date_echeance,
    montant_ht: Number(updatedFacture.montant_ht),
    montant_tva: Number(updatedFacture.montant_tva),
    montant_ttc: Number(updatedFacture.montant_ttc),
    solde_du: Number(updatedFacture.solde_du),
    snapshot,
    lignes: lines.map((line) => ({
      ...line,
      quantite: Number(line.quantite),
      prix_unitaire: Number(line.prix_unitaire),
      taux_tva: Number(line.taux_tva),
      total_ligne_ht: Number(line.total_ligne_ht),
      total_ligne_tva: Number(line.total_ligne_tva),
      total_ligne_ttc: Number(line.total_ligne_ttc),
    })),
  });
  const path = `${user.id}/${facture.id}/${updatedFacture.numero}.pdf`;
  const { error: uploadError } = await admin.storage.from("factures").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
    cacheControl: "31536000",
  });
  if (uploadError) {
    return NextResponse.json({
      error: `Facture validée, mais archivage PDF impossible : ${uploadError.message}`,
      validated: true,
      facture_id: facture.id,
    }, { status: 500 });
  }

  const { error: pathError } = await admin
    .from("factures")
    .update({ pdf_storage_path: path })
    .eq("id", facture.id);
  if (pathError) {
    return NextResponse.json({ error: pathError.message, validated: true }, { status: 500 });
  }

  let emailSent = Boolean(updatedFacture.email_envoye_at);
  if (!emailSent && snapshot.client.email) {
    const template = emailTemplates.facture_emise({
      prenom: snapshot.client.prenom,
      numero: updatedFacture.numero,
      montant: Number(updatedFacture.montant_ttc),
    });
    const emailResult = await sendEmail({
      to: snapshot.client.email,
      toUserId: user.id,
      template: "facture_emise",
      subject: template.subject,
      html: template.html,
      prefKey: "email_facture",
      payload: { facture_id: facture.id },
      attachments: [{
        filename: `${updatedFacture.numero}.pdf`,
        content: Buffer.from(bytes).toString("base64"),
      }],
    });
    emailSent = emailResult.ok;
    if (emailSent) {
      await admin.from("factures").update({ email_envoye_at: new Date().toISOString() }).eq("id", facture.id);
    }
  }

  const { data: signed } = await admin.storage.from("factures").createSignedUrl(path, 60);
  return NextResponse.json({
    success: true,
    facture_id: facture.id,
    numero: updatedFacture.numero,
    montant_ttc: Number(updatedFacture.montant_ttc),
    solde_du: Number(updatedFacture.solde_du),
    statut: updatedFacture.statut,
    email_sent: emailSent,
    pdf_url: signed?.signedUrl ?? null,
    already_validated: Boolean(validation?.already_validated),
  });
}