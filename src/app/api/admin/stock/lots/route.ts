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

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");

  let query = admin
    .from("stock_lots")
    .select(
      "id, article_id, numero_lot, fournisseur, date_reception, date_peremption, quantite_initiale, quantite_restante, cout_unitaire, actif, notes, created_at, updated_at"
    )
    .order("date_peremption", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (articleId) query = query.eq("article_id", articleId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lots: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = (await request.json()) as {
    article_id?: string;
    numero_lot?: string;
    fournisseur?: string | null;
    date_reception?: string | null;
    date_peremption?: string | null;
    quantite_initiale?: number | string;
    cout_unitaire?: number | string | null;
    notes?: string | null;
  };

  if (!body.article_id || !body.numero_lot?.trim()) {
    return NextResponse.json({ error: "article_id et numero_lot requis" }, { status: 400 });
  }

  const quantiteInitiale = Number(body.quantite_initiale || 0);
  if (!Number.isFinite(quantiteInitiale) || quantiteInitiale <= 0) {
    return NextResponse.json({ error: "quantite_initiale invalide" }, { status: 400 });
  }

  const { data: lot, error: lotError } = await admin
    .from("stock_lots")
    .insert({
      article_id: body.article_id,
      numero_lot: body.numero_lot.trim(),
      fournisseur: body.fournisseur?.trim() || null,
      date_reception: body.date_reception || null,
      date_peremption: body.date_peremption || null,
      quantite_initiale: quantiteInitiale,
      quantite_restante: 0,
      cout_unitaire: body.cout_unitaire ? Number(body.cout_unitaire) : null,
      notes: body.notes?.trim() || null,
      created_by: userId,
    })
    .select(
      "id, article_id, numero_lot, fournisseur, date_reception, date_peremption, quantite_initiale, quantite_restante, cout_unitaire, actif, notes, created_at, updated_at"
    )
    .single();

  if (lotError || !lot) {
    return NextResponse.json({ error: lotError?.message || "Erreur création lot" }, { status: 500 });
  }

  // L'entrée initiale passe par un mouvement pour garder la trace et alimenter article/lot via trigger.
  const { error: moveError } = await admin.from("stock_mouvements").insert({
    article_id: body.article_id,
    lot_id: lot.id,
    type_mouvement: "entree",
    quantite: quantiteInitiale,
    motif: `Entrée initiale lot ${lot.numero_lot}`,
    metadata: { source: "lot_creation" },
    created_by: userId,
  });

  if (moveError) {
    return NextResponse.json({ error: moveError.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "stock_lots.create",
    entity_type: "stock_lots",
    entity_id: lot.id,
    metadata: {
      article_id: body.article_id,
      numero_lot: lot.numero_lot,
      quantite_initiale: quantiteInitiale,
      date_peremption: body.date_peremption || null,
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  const { data: refreshedLot } = await admin
    .from("stock_lots")
    .select(
      "id, article_id, numero_lot, fournisseur, date_reception, date_peremption, quantite_initiale, quantite_restante, cout_unitaire, actif, notes, created_at, updated_at"
    )
    .eq("id", lot.id)
    .single();

  return NextResponse.json(refreshedLot ?? lot, { status: 201 });
}
