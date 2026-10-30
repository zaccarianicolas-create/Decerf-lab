import { NextResponse } from "next/server";
import { requireBillitAdmin } from "@/lib/billit-admin";
import { createAndSendSandboxTestInvoice } from "@/lib/billit";

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