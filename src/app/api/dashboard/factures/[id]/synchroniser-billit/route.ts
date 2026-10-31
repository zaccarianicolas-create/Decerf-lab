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
    .select("id, numero, statut, dentiste_id, montant_ttc, solde_du, billit_order_id")
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
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Synchronisation Billit impossible.";
    await admin.from("factures").update({ billit_last_error: message }).eq("id", facture.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
