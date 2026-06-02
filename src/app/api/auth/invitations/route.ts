import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const rl = await rateLimit(request, {
    key: "invitation_lookup",
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!rl.ok) return rl.response;

  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invitations_inscription")
    .select("email, nom, prenom, telephone, cabinet_nom, type_compte_client, expire_at, accepte_at, annule_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  }

  if (data.annule_at) {
    return NextResponse.json({ error: "Invitation annulee" }, { status: 410 });
  }

  if (data.accepte_at) {
    return NextResponse.json({ error: "Invitation deja utilisee" }, { status: 409 });
  }

  if (new Date(data.expire_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Invitation expiree" }, { status: 410 });
  }

  return NextResponse.json({
    invitation: {
      email: data.email,
      nom: data.nom,
      prenom: data.prenom,
      telephone: data.telephone,
      cabinet_nom: data.cabinet_nom,
      type_compte_client: data.type_compte_client,
      expire_at: data.expire_at,
    },
  });
}
