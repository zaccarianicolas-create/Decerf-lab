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

  const [{ data: articles }, { data: commandes }, { data: fiches }] = await Promise.all([
    admin
      .from("stock_articles")
      .select("id, nom, categorie, unite, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at")
      .order("actif", { ascending: false })
      .order("nom", { ascending: true }),
    admin.from("commandes").select("id, numero").order("created_at", { ascending: false }).limit(30),
    admin.from("fiches_manuelles").select("id, numero, titre").order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <StockList
      initialArticles={(articles ?? []) as any}
      commandes={(commandes ?? []) as any}
      fiches={(fiches ?? []) as any}
    />
  );
}
