import { NextResponse } from "next/server";
import { getBillitConfig, isBillitConfigured } from "@/lib/billit";
import { requireBillitAdmin } from "@/lib/billit-admin";

export async function GET() {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const { data, error } = await auth.admin
    .from("billit_connections")
    .select("connected_at, access_token_expires_at")
    .eq("singleton", true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "État Billit indisponible." }, { status: 500 });

  const configured = isBillitConfigured();
  const config = configured ? getBillitConfig() : null;
  return NextResponse.json({
    configured,
    connected: Boolean(data) || config?.authMode === "api_key",
    authMode: config?.authMode ?? null,
    environment: "sandbox",
    connected_at: data?.connected_at ?? null,
    access_token_expires_at: data?.access_token_expires_at ?? null,
  });
}

export async function DELETE() {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const { error } = await auth.admin.from("billit_connections").delete().eq("singleton", true);
  if (error) return NextResponse.json({ error: "Déconnexion Billit impossible." }, { status: 500 });
  return NextResponse.json({ success: true });
}