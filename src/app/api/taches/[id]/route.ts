import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logAudit, extractRequestMeta } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id: tacheId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Charger la tâche pour vérifier les droits
  const { data: tache } = await admin
    .from("commande_taches")
    .select("id, assignee_id, commande_id, statut")
    .eq("id", tacheId)
    .maybeSingle();

  if (!tache) {
    return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });
  }

  const isAssignee = tache.assignee_id === user.id;
  if (!isAdmin && !isAssignee) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const update: Record<string, unknown> = {};

  if (typeof body?.statut === "string") {
    update.statut = body.statut;
    if (body.statut === "fait") {
      update.done_at = new Date().toISOString();
      update.done_by = user.id;
    } else {
      update.done_at = null;
      update.done_by = null;
    }
  }

  if (isAdmin) {
    if (typeof body?.titre === "string") update.titre = body.titre;
    if (typeof body?.description === "string") update.description = body.description;
    if ("assignee_id" in body) update.assignee_id = body.assignee_id;
    if (typeof body?.priorite === "string") update.priorite = body.priorite;
    if ("due_date" in body) update.due_date = body.due_date;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("commande_taches")
    .update(update)
    .eq("id", tacheId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: isAdmin ? "admin" : "technicien",
    action: "tache.update",
    entity_type: "commande_tache",
    entity_id: tacheId,
    metadata: update,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true, tache: data });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { id: tacheId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { error } = await admin.from("commande_taches").delete().eq("id", tacheId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: user.id,
    actor_role: "admin",
    action: "tache.delete",
    entity_type: "commande_tache",
    entity_id: tacheId,
    metadata: {},
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ success: true });
}
