import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { StockList } from "./stock-list";

export default async function AdminStockPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: articles }, { data: lots }, { data: commandes }, { data: fiches }, { data: parametres }] = await Promise.all([
    admin
      .from("stock_articles")
      .select("id, nom, categorie, unite, gestion_lots, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at")
      .order("actif", { ascending: false })
      .order("nom", { ascending: true }),
    admin
      .from("stock_lots")
      .select("id, article_id, numero_lot, date_peremption, quantite_restante")
      .gt("quantite_restante", 0)
      .order("date_peremption", { ascending: true, nullsFirst: false }),
    admin.from("commandes").select("id, numero").order("created_at", { ascending: false }).limit(30),
    admin.from("fiches_manuelles").select("id, numero, titre").order("created_at", { ascending: false }).limit(30),
    admin.from("parametres_labo").select("gestion_lots_stock_active").limit(1).maybeSingle(),
  ]);

  const lotsFeatureEnabled = parametres?.gestion_lots_stock_active ?? true;

  return (
    <StockList
      initialArticles={(articles ?? []) as any}
      lots={(lots ?? []) as any}
      lotsFeatureEnabled={lotsFeatureEnabled}
      commandes={(commandes ?? []) as any}
      fiches={(fiches ?? []) as any}
    />
  );
}
