import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBillitOrderStatus } from "@/lib/billit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const { id } = await params;
  const { data: facture, error: factureError } = await admin
    .from("factures")
    .select("id, numero, statut, dentiste_id, commande_id, montant_ttc, solde_du, billit_order_id")
    .eq("id", id)
    .maybeSingle();
  if (factureError || !facture) {
    return NextResponse.json({ error: factureError?.message || "Facture introuvable." }, { status: 404 });
  }
  if (facture.dentiste_id !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  if (!facture.billit_order_id) {
    return NextResponse.json({ error: "Cette facture n’est pas synchronisée avec Billit." }, { status: 409 });
  }

  try {
    const status = await getBillitOrderStatus(admin, Number(facture.billit_order_id));
    const paidAmount = status.totalIncl !== null && status.toPay !== null
      ? Math.max(0, Math.round((status.totalIncl - status.toPay) * 100) / 100)
      : null;
    const nextBalance = status.toPay === null ? Number(facture.solde_du) : Math.max(0, status.toPay);
    const nextTotal = status.totalIncl === null ? Number(facture.montant_ttc) : status.totalIncl;
    const nextStatus = status.paid || nextBalance <= 0
      ? "payee"
      : paidAmount !== null && paidAmount > 0
        ? "partiellement_payee"
        : status.isSent
          ? "envoyee"
          : facture.statut === "brouillon" ? "brouillon" : "emise";

      let billitPaymentReconciled = 0;
      if (paidAmount !== null) {
        const { data: payments, error: paymentsError } = await admin
          .from("paiements")
          .select("id, montant, statut, billit_payment_key")
          .eq("facture_id", facture.id);
        if (paymentsError) throw new Error(paymentsError.message);

        const localPaid = (payments ?? []).reduce((total, payment) =>
          payment.statut === "paye" && !payment.billit_payment_key
            ? total + Number(payment.montant || 0)
            : total, 0);
        const targetBillitPaid = Math.round(paidAmount * 100) / 100;
        const reconciliation = Math.round((targetBillitPaid - localPaid) * 100) / 100;
        if (reconciliation < -0.01) {
          throw new Error("Les paiements locaux dépassent le cumul Billit. Vérifie le rapprochement avant de synchroniser.");
        }

        const paymentKey = `billit-order-${facture.billit_order_id}`;
        const existingBillitPayment = (payments ?? []).find((payment) => payment.billit_payment_key === paymentKey);
        if (reconciliation > 0) {
          let paymentId = existingBillitPayment?.id;
          if (paymentId) {
            const { error } = await admin.from("paiements").update({
              montant: reconciliation,
              statut: "paye",
              methode: "billit",
              reference_externe: `Billit ${facture.billit_order_id}`,
            }).eq("id", paymentId);
            if (error) throw new Error(error.message);
          } else {
            const { data: payment, error } = await admin.from("paiements").insert({
              commande_id: facture.commande_id,
              facture_id: facture.id,
              montant: reconciliation,
              devise: "eur",
              statut: "paye",
              methode: "billit",
              reference_externe: `Billit ${facture.billit_order_id}`,
              billit_payment_key: paymentKey,
            }).select("id").single();
            if (error || !payment) throw new Error(error?.message || "Paiement Billit impossible à enregistrer.");
            paymentId = payment.id;
          }

          const { data: ledger, error: ledgerError } = await admin
            .from("ecritures_compte_client")
            .select("id")
            .eq("paiement_id", paymentId)
            .eq("type_ecriture", "paiement")
            .maybeSingle();
          if (ledgerError) throw new Error(ledgerError.message);
          if (ledger) {
            const { error } = await admin.from("ecritures_compte_client").update({ montant: -reconciliation }).eq("id", ledger.id);
            if (error) throw new Error(error.message);
          } else {
            const { error } = await admin.from("ecritures_compte_client").insert({
              dentiste_id: facture.dentiste_id,
              facture_id: facture.id,
              paiement_id: paymentId,
              type_ecriture: "paiement",
              libelle: `Règlement rapproché via Billit pour ${facture.numero}`,
              montant: -reconciliation,
            });
            if (error) throw new Error(error.message);
          }
          billitPaymentReconciled = reconciliation;
        } else if (existingBillitPayment && Number(existingBillitPayment.montant) > 0) {
          throw new Error("Le cumul Billit a diminué après un paiement déjà rapproché. Vérifie le remboursement dans Billit avant synchronisation.");
        }
      }

    const { error: invoiceUpdateError } = await admin.from("factures").update({
      statut: nextStatus,
      montant_ttc: nextTotal,
      solde_du: nextBalance,
      billit_status: status.isSent ? "sent" : "created",
      billit_order_status: status.orderStatus,
      billit_delivery_status: status.deliveryStatus,
      billit_is_sent: status.isSent,
      billit_is_delivered: status.delivered,
      ...(paidAmount !== null ? { billit_paid_amount: paidAmount } : {}),
      billit_last_error: null,
      billit_synced_at: new Date().toISOString(),
    }).eq("id", facture.id);
    if (invoiceUpdateError) throw new Error(invoiceUpdateError.message);

    return NextResponse.json({
      success: true,
      facture_id: facture.id,
      numero: facture.numero,
      statut: nextStatus,
      montant_ttc: nextTotal,
      montant_paye: paidAmount,
      solde_du: nextBalance,
      billit_order_status: status.orderStatus,
      billit_delivery_status: status.deliveryStatus,
      billit_is_sent: status.isSent,
      billit_is_delivered: status.delivered,
      paiement_billit_rapproche: billitPaymentReconciled,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronisation Billit impossible.";
    await admin.from("factures").update({ billit_last_error: message }).eq("id", facture.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
