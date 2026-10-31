import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addBillitPayment, formatBillitDateInBrussels, getBillitConfig, getBillitOrderStatus } from "@/lib/billit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const montant = Number(body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: facture, error: factureError } = await admin
    .from("factures")
    .select("id, numero, montant_ttc, solde_du, billit_order_id")
    .eq("id", id)
    .maybeSingle();
  if (factureError || !facture) {
    return NextResponse.json({ error: factureError?.message || "Facture introuvable." }, { status: 404 });
  }

  let billitPaymentSent = false;
  if (facture.billit_order_id) {
    try {
      if (process.env.BILLIT_SEND_REAL_INVOICES !== "true" || getBillitConfig().environment !== "production") {
        return NextResponse.json({ error: "Cette facture est liée à Billit. Active d’abord la configuration Production validée pour synchroniser un paiement." }, { status: 409 });
      }
      const billitStatus = await getBillitOrderStatus(admin, Number(facture.billit_order_id));
      if (billitStatus.toPay === null || Math.abs(billitStatus.toPay - Number(facture.solde_du)) > 0.01) {
        return NextResponse.json({ error: "Le solde local et Billit diffèrent. Synchronise d’abord la facture avant d’enregistrer ce paiement." }, { status: 409 });
      }
      if (montant > billitStatus.toPay) {
        return NextResponse.json({ error: "Le paiement dépasse le solde Billit restant." }, { status: 400 });
      }
      await addBillitPayment(
        admin,
        Number(facture.billit_order_id),
        montant,
        typeof body.reference === "string" && body.reference.trim() ? body.reference.trim() : `Virement reçu pour ${facture.numero}`,
        formatBillitDateInBrussels(new Date())
      );
      billitPaymentSent = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Synchronisation du paiement Billit impossible.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const { data, error } = await admin.rpc("enregistrer_paiement_facture", {
    p_facture_id: id,
    p_admin_id: user.id,
    p_montant: montant,
    p_reference: typeof body.reference === "string" ? body.reference : "",
  });
  if (error) {
    return NextResponse.json({
      error: billitPaymentSent
        ? `Billit a enregistré le paiement, mais le grand livre Decerf n’a pas pu être mis à jour. Synchronise la facture avant de réessayer. ${error.message}`
        : error.message,
      billit_payment_sent: billitPaymentSent,
    }, { status: billitPaymentSent ? 502 : 400 });
  }
  return NextResponse.json({ success: true, billit_payment_sent: billitPaymentSent, ...data });
}