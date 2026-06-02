import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

type InvitationBody = {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  cabinet_nom?: string;
  type_compte_client?: "dentiste_independant" | "clinique";
};

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifie" }, { status: 401 }) };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorise" }, { status: 403 }) };
  }

  return { admin, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { admin } = auth;
  const { data, error } = await admin
    .from("invitations_inscription")
    .select("id,email,nom,prenom,type_compte_client,cabinet_nom,expire_at,accepte_at,annule_at,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { admin, userId } = auth;

  const body = (await request.json()) as InvitationBody;
  const email = body.email?.trim().toLowerCase();
  const nom = body.nom?.trim() || null;
  const prenom = body.prenom?.trim() || null;
  const telephone = body.telephone?.trim() || null;
  const cabinetNom = body.cabinet_nom?.trim() || null;
  const typeCompte = body.type_compte_client || "dentiste_independant";

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  let cabinetId: string | null = null;
  if (cabinetNom) {
    const { data: existing } = await admin
      .from("cabinets")
      .select("id")
      .ilike("nom", cabinetNom)
      .maybeSingle();

    if (existing?.id) {
      cabinetId = existing.id;
    } else {
      const { data: created, error: createCabinetError } = await admin
        .from("cabinets")
        .insert({ nom: cabinetNom, onboarding_source: "invitation_labo" })
        .select("id")
        .single();

      if (createCabinetError) {
        return NextResponse.json({ error: createCabinetError.message }, { status: 400 });
      }

      cabinetId = created.id;
    }
  }

  const token = `${crypto.randomUUID()}-${Date.now().toString(36)}`;
  const expireAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("invitations_inscription")
    .insert({
      email,
      nom,
      prenom,
      telephone,
      cabinet_nom: cabinetNom,
      cabinet_id: cabinetId,
      role_cible: "dentiste",
      onboarding_source: "invitation_labo",
      type_compte_client: typeCompte,
      token,
      expire_at: expireAt,
      created_by: userId,
    })
    .select("id, token, expire_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Erreur creation invitation" }, { status: 400 });
  }

  const invitationUrl = `${request.nextUrl.origin}/register?invitation=${encodeURIComponent(data.token)}`;

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "invitation.create",
    entity_type: "invitation",
    entity_id: data.id,
    metadata: { email, type_compte: typeCompte, cabinet: cabinetNom },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    success: true,
    invitation: {
      id: data.id,
      expire_at: data.expire_at,
      url: invitationUrl,
    },
  });
}
