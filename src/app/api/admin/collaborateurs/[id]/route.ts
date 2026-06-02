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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id } = await context.params;

  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (typeof body?.actif_collaborateur === "boolean") {
    update.actif_collaborateur = body.actif_collaborateur;
    update.actif = body.actif_collaborateur;
  }
  if (typeof body?.role_labo === "string") {
    update.role_labo = body.role_labo;
  }
  if (typeof body?.telephone === "string") {
    update.telephone = body.telephone;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .eq("role", "technicien")
    .select("id, actif_collaborateur, role_labo, telephone")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erreur" },
      { status: 400 }
    );
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "collaborateur.update",
    entity_type: "profile",
    entity_id: id,
    metadata: update,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, collaborateur: data });
}
