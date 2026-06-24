import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { StockDetail } from "./stock-detail";

export default async function AdminStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: article }, { data: mouvements }, { data: commandes }, { data: fiches }] =
    await Promise.all([
      admin
        .from("stock_articles")
        .select("id, nom, categorie, unite, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at, created_by")
        .eq("id", id)
        .single(),
      admin
        .from("stock_mouvements")
        .select(
          `id, article_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, commande_id, fiche_manuelle_id, metadata, created_at,
           commande:commandes(id, numero),
           fiche_manuelle:fiches_manuelles(id, numero, titre)`
        )
        .eq("article_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin.from("commandes").select("id, numero").order("created_at", { ascending: false }).limit(50),
      admin.from("fiches_manuelles").select("id, numero, titre").order("created_at", { ascending: false }).limit(50),
    ]);

  if (!article) notFound();

  return (
    <StockDetail
      article={article as any}
      mouvements={(mouvements ?? []) as any}
      commandes={(commandes ?? []) as any}
      fiches={(fiches ?? []) as any}
    />
  );
}
