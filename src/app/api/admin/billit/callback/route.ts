import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  encryptBillitToken,
  exchangeBillitAuthorizationCode,
  getBillitConfig,
} from "@/lib/billit";
import { requireBillitAdmin } from "@/lib/billit-admin";

const STATE_COOKIE = "billit_oauth_state";

function safeStateMatch(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/admin/parametres?billit=error", url.origin));
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  const stateCookie = request.headers.get("cookie")?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);
  response.cookies.set(STATE_COOKIE, "", { path: "/api/admin/billit/callback", maxAge: 0 });

  const code = url.searchParams.get("code");
  if (!safeStateMatch(stateCookie, url.searchParams.get("state")) || !code || url.searchParams.has("error")) {
    return response;
  }

  try {
    getBillitConfig();
    const token = await exchangeBillitAuthorizationCode(code);
    const { error } = await auth.admin.from("billit_connections").upsert({
      singleton: true,
      access_token_encrypted: encryptBillitToken(token.accessToken),
      refresh_token_encrypted: encryptBillitToken(token.refreshToken),
      access_token_expires_at: new Date(Date.now() + token.expiresIn * 1000).toISOString(),
      updated_by: auth.userId,
    }, { onConflict: "singleton" });
    if (error) return response;

    return NextResponse.redirect(new URL("/admin/parametres?billit=connected", url.origin));
  } catch {
    return response;
  }
}