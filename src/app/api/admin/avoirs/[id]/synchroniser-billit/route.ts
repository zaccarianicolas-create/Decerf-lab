import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireBillitAdmin } from "@/lib/billit-admin";
import { downloadBillitOrderPdf, getBillitOrderStatus } from "@/lib/billit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: credit, error } = await admin
    .from("avoirs")
    .select("id, numero, statut, billit_order_id, billit_pdf_storage_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !credit) {
    return NextResponse.json({ error: error?.message || "Avoir introuvable." }, { status: 404 });
  }
  if (!credit.billit_order_id) {
    return NextResponse.json({ error: "Cet avoir n’a pas encore d’identifiant Billit." }, { status: 409 });
  }

  try {
    const status = await getBillitOrderStatus(admin, Number(credit.billit_order_id));
    let pdfPath = credit.billit_pdf_storage_path;
    if (status.isSent && !pdfPath) {
      const pdf = await downloadBillitOrderPdf(admin, Number(credit.billit_order_id));
      pdfPath = `billit/avoirs/${credit.id}/${pdf.fileName}`;
      const { error: uploadError } = await admin.storage.from("factures").upload(pdfPath, pdf.bytes, {
        contentType: pdf.mimeType,
        upsert: true,
        cacheControl: "31536000",
      });
      if (uploadError) throw new Error(`Le PDF Billit n’a pas pu être archivé : ${uploadError.message}`);
    }

    const { error: updateError } = await admin.from("avoirs").update({
      billit_order_status: status.orderStatus,
      billit_delivery_status: status.deliveryStatus,
      billit_is_sent: status.isSent,
      billit_is_delivered: status.delivered,
      billit_pdf_storage_path: pdfPath,
      billit_last_error: null,
      billit_synced_at: new Date().toISOString(),
    }).eq("id", credit.id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      success: true,
      order_status: status.orderStatus,
      delivery_status: status.deliveryStatus,
      is_sent: status.isSent,
      delivered: status.delivered,
    });
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Synchronisation Billit impossible.";
    await admin.from("avoirs").update({ billit_last_error: message }).eq("id", credit.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
