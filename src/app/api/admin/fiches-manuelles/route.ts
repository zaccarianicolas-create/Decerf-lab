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

// GET /api/admin/fiches-manuelles — liste paginée avec filtres
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get("statut");
  const priorite = searchParams.get("priorite");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 50;

  let query = admin
    .from("fiches_manuelles")
    .select(
      `id, numero, titre, statut, priorite, date_echeance, created_at, updated_at,
       patient:patients(id, reference, nom, prenom),
       dentiste:profiles!fiches_manuelles_dentiste_id_fkey(id, nom, prenom),
       assignee:profiles!fiches_manuelles_assignee_id_fkey(id, nom, prenom),
       items`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (statut) query = query.eq("statut", statut);
  if (priorite) query = query.eq("priorite", priorite);
  if (search) {
    query = query.or(
      `titre.ilike.%${search}%,numero.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ fiches: data, total: count, page, limit });
}

// POST /api/admin/fiches-manuelles — créer une fiche manuelle
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = (await request.json()) as {
    titre?: string;
    description?: string;
    patient_id?: string | null;
    dentiste_id?: string | null;
    items?: any[];
    statut?: string;
    priorite?: string;
    assignee_id?: string | null;
    date_echeance?: string | null;
    notes_internes?: string;
  };

  if (!body.titre?.trim()) {
    return NextResponse.json({ error: "titre requis" }, { status: 400 });
  }

  const { data: fiche, error } = await admin
    .from("fiches_manuelles")
    .insert({
      titre: body.titre.trim(),
      description: body.description?.trim() || null,
      patient_id: body.patient_id || null,
      dentiste_id: body.dentiste_id || null,
      items: body.items || [],
      statut: body.statut || "brouillon",
      priorite: body.priorite || "normale",
      assignee_id: body.assignee_id || null,
      date_echeance: body.date_echeance || null,
      notes_internes: body.notes_internes?.trim() || null,
      created_by: userId,
    })
    .select("id, numero")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "fiches_manuelles.create",
    entity_type: "fiches_manuelles",
    entity_id: fiche!.id,
    metadata: { titre: body.titre, statut: body.statut || "brouillon" },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json(fiche, { status: 201 });
}
