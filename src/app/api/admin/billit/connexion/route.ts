import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createBillitAuthorizationUrl, getBillitConfig } from "@/lib/billit";
import { requireBillitAdmin } from "@/lib/billit-admin";

const STATE_COOKIE = "billit_oauth_state";
const CALLBACK_PATH = "/api/admin/billit/callback";

export async function GET(request: Request) {
  const auth = await requireBillitAdmin();
  if ("response" in auth) return auth.response;

  try {
    const config = getBillitConfig();
    if (config.authMode !== "oauth") {
      return NextResponse.json({ error: "Une clé API Sandbox est configurée; la connexion OAuth n’est pas nécessaire." }, { status: 400 });
    }
    const redirect = new URL(config.redirectUri);
    const requestUrl = new URL(request.url);
    if (redirect.origin !== requestUrl.origin || redirect.pathname !== CALLBACK_PATH) {
      return NextResponse.json({ error: "L’URL OAuth doit être le callback HTTPS de cette application." }, { status: 400 });
    }

    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createBillitAuthorizationUrl(state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: CALLBACK_PATH,
      maxAge: 600,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Configuration Billit incomplète.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}