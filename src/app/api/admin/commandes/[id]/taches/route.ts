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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id: commandeId } = await context.params;

  const body = await request.json();
  const titre = (body?.titre as string | undefined)?.trim();
  if (!titre) {
    return NextResponse.json({ error: "titre requis" }, { status: 400 });
  }

  const insert: Record<string, unknown> = {
    commande_id: commandeId,
    titre,
    description: body?.description ?? null,
    assignee_id: body?.assignee_id ?? null,
    priorite: body?.priorite ?? "normale",
    due_date: body?.due_date ?? null,
    created_by: userId,
  };

  const { data, error } = await admin
    .from("commande_taches")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "admin",
    action: "tache.create",
    entity_type: "commande_tache",
    entity_id: data.id,
    metadata: { commande_id: commandeId, titre, assignee_id: data.assignee_id },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, tache: data });
}
