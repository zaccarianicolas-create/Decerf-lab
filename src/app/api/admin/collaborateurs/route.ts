import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { data, error } = await auth.admin
    .from("profiles")
    .select("id, nom, prenom, email, telephone, role, role_labo, actif_collaborateur, created_at")
    .eq("role", "technicien")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ collaborateurs: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = await request.json();
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const nom = (body?.nom as string | undefined)?.trim() || null;
  const prenom = (body?.prenom as string | undefined)?.trim() || null;
  const telephone = (body?.telephone as string | undefined)?.trim() || null;
  const roleLabo = (body?.role_labo as string | undefined)?.trim() || null;

  if (!email || !nom || !prenom) {
    return NextResponse.json(
      { error: "Email, nom et prénom requis" },
      { status: 400 }
    );
  }

  const tempPassword = `${crypto.randomUUID()}-${Date.now().toString(36)}`;

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nom, prenom, role: "technicien" },
  });

  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message || "Erreur création compte" },
      { status: 400 }
    );
  }

  const userIdNew = created.user.id;

  await admin
    .from("profiles")
    .update({
      nom,
      prenom,
      telephone,
      role: "technicien",
      role_labo: roleLabo,
      statut_compte: "approuve",
      actif: true,
      actif_collaborateur: true,
    })
    .eq("id", userIdNew);

  // Envoyer email d'invitation (set password)
  let inviteUrl: string | null = null;
  try {
    const { data: link } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    inviteUrl = link?.properties?.action_link ?? null;
  } catch (err) {
    console.error("[collaborateurs] invite link error", err);
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "collaborateur.invite",
    entity_type: "profile",
    entity_id: userIdNew,
    metadata: { email, role_labo: roleLabo },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({
    success: true,
    collaborateur: { id: userIdNew, email, nom, prenom, role_labo: roleLabo },
    invite_url: inviteUrl,
  });
}
