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

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin } = auth;

  const { data, error } = await admin
    .from("stock_articles")
    .select(
      "id, nom, categorie, unite, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at"
    )
    .order("actif", { ascending: false })
    .order("nom", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ articles: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;
  const body = (await request.json()) as {
    nom?: string;
    categorie?: string;
    unite?: string;
    seuil_alerte?: number | string;
    emplacement?: string | null;
    notes?: string | null;
    actif?: boolean;
  };

  if (!body.nom?.trim()) {
    return NextResponse.json({ error: "nom requis" }, { status: 400 });
  }

  const payload = {
    nom: body.nom.trim(),
    categorie: body.categorie || "autre",
    unite: body.unite || "piece",
    seuil_alerte: body.seuil_alerte ? Number(body.seuil_alerte) : 0,
    emplacement: body.emplacement?.trim() || null,
    notes: body.notes?.trim() || null,
    actif: body.actif ?? true,
    created_by: userId,
  };

  const { data, error } = await admin
    .from("stock_articles")
    .insert(payload)
    .select("id, nom, categorie, unite, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    action: "stock_articles.create",
    entity_type: "stock_articles",
    entity_id: data.id,
    metadata: payload,
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json(data, { status: 201 });
}
