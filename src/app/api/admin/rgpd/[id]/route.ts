import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const statut = body?.statut as
    | "demande"
    | "en_cours"
    | "traite"
    | "refuse"
    | undefined;
  const reponse = (body?.reponse as string | undefined)?.slice(0, 4000) || null;

  if (!statut || !["demande", "en_cours", "traite", "refuse"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const update: Record<string, unknown> = { statut, reponse };
  if (statut === "traite" || statut === "refuse") {
    update.traite_at = new Date().toISOString();
    update.traite_par = userId;
  }

  const { data, error } = await admin
    .from("rgpd_requests")
    .update(update)
    .eq("id", id)
    .select("id, user_id, type, statut")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Erreur mise à jour" },
      { status: 400 }
    );
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: `rgpd.update.${statut}`,
    entity_type: "rgpd_request",
    entity_id: data.id,
    metadata: { user_id: data.user_id, type: data.type, statut },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, request: data });
}
