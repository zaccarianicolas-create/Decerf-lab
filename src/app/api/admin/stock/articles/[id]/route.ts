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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;
  const { id } = await params;

  const { data, error } = await admin
    .from("stock_articles")
    .select("id, nom, categorie, unite, gestion_lots, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const allowed = ["nom", "categorie", "unite", "gestion_lots", "seuil_alerte", "emplacement", "notes", "actif"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour" }, { status: 400 });
  }

  if (typeof updates.nom === "string") updates.nom = updates.nom.trim();
  if (typeof updates.emplacement === "string") updates.emplacement = updates.emplacement.trim() || null;
  if (typeof updates.notes === "string") updates.notes = updates.notes.trim() || null;
  if (typeof updates.seuil_alerte === "string" || typeof updates.seuil_alerte === "number") {
    updates.seuil_alerte = Number(updates.seuil_alerte);
  }

  const { data, error } = await admin
    .from("stock_articles")
    .update(updates)
    .eq("id", id)
    .select("id, nom, categorie, unite, gestion_lots, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "stock_articles.update",
    entity_type: "stock_articles",
    entity_id: id,
    metadata: updates,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const { id } = await params;

  const { error } = await admin.from("stock_articles").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "stock_articles.delete",
    entity_type: "stock_articles",
    entity_id: id,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return new NextResponse(null, { status: 204 });
}
