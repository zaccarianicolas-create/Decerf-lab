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

  const [{ data: article }, { data: lots }, { data: mouvements }, { data: commandes }, { data: fiches }, { data: protocoleInstances }, { data: parametres }] =
    await Promise.all([
      admin
        .from("stock_articles")
        .select("id, nom, categorie, unite, gestion_lots, quantite_stock, seuil_alerte, emplacement, actif, notes, created_at, updated_at, created_by")
        .eq("id", id)
        .single(),
      admin
        .from("stock_lots")
        .select("id, article_id, numero_lot, fournisseur, date_reception, date_peremption, quantite_initiale, quantite_restante, cout_unitaire, actif, notes, created_at")
        .eq("article_id", id)
        .order("date_peremption", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false }),
      admin
        .from("stock_mouvements")
        .select(
          `id, article_id, lot_id, protocole_instance_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, commande_id, fiche_manuelle_id, metadata, created_at,
           lot:stock_lots(id, numero_lot, date_peremption),
           commande:commandes(id, numero),
           fiche_manuelle:fiches_manuelles(id, numero, titre),
           protocole_instance:protocole_instances(id, titre)`
        )
        .eq("article_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin.from("commandes").select("id, numero").order("created_at", { ascending: false }).limit(50),
      admin.from("fiches_manuelles").select("id, numero, titre").order("created_at", { ascending: false }).limit(50),
      admin.from("protocole_instances").select("id, titre, statut").order("created_at", { ascending: false }).limit(50),
      admin.from("parametres_labo").select("gestion_lots_stock_active").limit(1).maybeSingle(),
    ]);

  const lotsFeatureEnabled = parametres?.gestion_lots_stock_active ?? true;

  if (!article) notFound();

  return (
    <StockDetail
      article={article as any}
      lots={(lots ?? []) as any}
      mouvements={(mouvements ?? []) as any}
      commandes={(commandes ?? []) as any}
      fiches={(fiches ?? []) as any}
      protocoleInstances={(protocoleInstances ?? []) as any}
      lotsFeatureEnabled={lotsFeatureEnabled}
    />
  );
}
