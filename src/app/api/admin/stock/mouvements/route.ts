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
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 200);

  let query = admin
    .from("stock_mouvements")
    .select(
      `id, article_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, commande_id, fiche_manuelle_id, metadata, created_at,
       article:stock_articles(id, nom, categorie, unite),
       commande:commandes(id, numero),
       fiche_manuelle:fiches_manuelles(id, numero, titre)`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (articleId) {
    query = query.eq("article_id", articleId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mouvements: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = (await request.json()) as {
    article_id?: string;
    type_mouvement?: string;
    quantite?: number | string;
    motif?: string | null;
    commande_id?: string | null;
    fiche_manuelle_id?: string | null;
    metadata?: Record<string, unknown>;
  };

  if (!body.article_id || !body.type_mouvement || !body.quantite) {
    return NextResponse.json({ error: "article_id, type_mouvement et quantite requis" }, { status: 400 });
  }

  const quantite = Number(body.quantite);
  if (!Number.isFinite(quantite) || quantite <= 0) {
    return NextResponse.json({ error: "quantite invalide" }, { status: 400 });
  }

  const allowed = [
    "entree",
    "sortie",
    "consommation",
    "casse",
    "ajustement_positif",
    "ajustement_negatif",
  ];
  if (!allowed.includes(body.type_mouvement)) {
    return NextResponse.json({ error: "type_mouvement invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("stock_mouvements")
    .insert({
      article_id: body.article_id,
      type_mouvement: body.type_mouvement,
      quantite,
      motif: body.motif?.trim() || null,
      commande_id: body.commande_id || null,
      fiche_manuelle_id: body.fiche_manuelle_id || null,
      metadata: body.metadata || {},
      created_by: userId,
    })
    .select(
      `id, article_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, commande_id, fiche_manuelle_id, metadata, created_at`
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "stock_mouvements.create",
    entity_type: "stock_mouvements",
    entity_id: data.id,
    metadata: {
      article_id: body.article_id,
      type_mouvement: body.type_mouvement,
      quantite,
      motif: body.motif || null,
      commande_id: body.commande_id || null,
      fiche_manuelle_id: body.fiche_manuelle_id || null,
    },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json(data, { status: 201 });
}
