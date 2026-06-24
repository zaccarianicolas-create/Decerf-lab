import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

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

// GET /api/admin/fiches-manuelles/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const { data: fiche, error } = await admin
    .from("fiches_manuelles")
    .select(
      `*,
       patient:patients(id, reference, nom, prenom, date_naissance),
       dentiste:profiles!fiches_manuelles_dentiste_id_fkey(id, nom, prenom, email, telephone),
       assignee:profiles!fiches_manuelles_assignee_id_fkey(id, nom, prenom),
       creator:profiles!fiches_manuelles_created_by_fkey(id, nom, prenom),
       events:fiche_manuelle_events(id, type, payload, created_at, creator:profiles!fiche_manuelle_events_created_by_fkey(id, nom, prenom))`
    )
    .eq("id", id)
    .single();

  if (error || !fiche) {
    return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });
  }

  return NextResponse.json(fiche);
}

// PUT /api/admin/fiches-manuelles/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id } = await params;

  const body = (await request.json()) as Record<string, unknown>;

  const allowed = [
    "titre", "description", "patient_id", "dentiste_id",
    "items", "statut", "priorite", "assignee_id",
    "date_echeance", "notes_internes",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  const { data: fiche, error } = await admin
    .from("fiches_manuelles")
    .update(updates)
    .eq("id", id)
    .select("id, numero, statut")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log event if statut changed
  if (updates.statut) {
    await admin.from("fiche_manuelle_events").insert({
      fiche_id: id,
      type: "statut_change",
      payload: { statut: updates.statut },
      created_by: userId,
    });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "fiches_manuelles.update",
    entity_type: "fiches_manuelles",
    entity_id: id,
    metadata: updates as Record<string, unknown>,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json(fiche);
}

// DELETE /api/admin/fiches-manuelles/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id } = await params;

  const { error } = await admin
    .from("fiches_manuelles")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "fiches_manuelles.delete",
    entity_type: "fiches_manuelles",
    entity_id: id,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return new NextResponse(null, { status: 204 });
}
