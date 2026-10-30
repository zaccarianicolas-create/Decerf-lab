import { NextResponse } from "next/server";
import { requireBillitAdmin } from "@/lib/billit-admin";
import { createAndSendSandboxTestInvoice, getBillitOrderStatus } from "@/lib/billit";

export async function GET(request: Request) {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const orderId = Number(new URL(request.url).searchParams.get("orderId"));
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "OrderID Sandbox invalide." }, { status: 400 });
  }

  try {
    const status = await getBillitOrderStatus(auth.admin, orderId);
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Statut Billit indisponible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST() {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  try {
    const result = await createAndSendSandboxTestInvoice(auth.admin);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi du test Billit impossible.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}