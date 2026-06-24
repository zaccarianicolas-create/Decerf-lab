import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { FicheManuelleDetail } from "./fiche-detail";

export default async function FicheManuelleDetailPage({
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

  const [{ data: fiche }, { data: patients }, { data: collaborateurs }, { data: stockArticles }, { data: stockLots }, { data: parametres }] =
    await Promise.all([
      admin
        .from("fiches_manuelles")
        .select(
          `*,
           patient:patients(id, reference, nom, prenom, date_naissance, sexe, telephone),
           dentiste:profiles!fiches_manuelles_dentiste_id_fkey(id, nom, prenom, email, telephone),
           assignee:profiles!fiches_manuelles_assignee_id_fkey(id, nom, prenom, role_labo),
           creator:profiles!fiches_manuelles_created_by_fkey(id, nom, prenom),
           events:fiche_manuelle_events(id, type, payload, created_at, creator:profiles!fiche_manuelle_events_created_by_fkey(id, nom, prenom))`
        )
        .eq("id", id)
        .single(),
      admin
        .from("patients")
        .select("id, reference, nom, prenom")
        .eq("actif", true)
        .order("nom"),
      admin
        .from("profiles")
        .select("id, nom, prenom, role_labo")
        .order("nom"),
      admin
        .from("stock_articles")
        .select("id, nom, unite, gestion_lots, quantite_stock, seuil_alerte")
        .eq("actif", true)
        .order("nom", { ascending: true }),
      admin
        .from("stock_lots")
        .select("id, article_id, numero_lot, date_peremption, quantite_restante")
        .gt("quantite_restante", 0)
        .order("date_peremption", { ascending: true, nullsFirst: false }),
        admin.from("parametres_labo").select("gestion_lots_stock_active").limit(1).maybeSingle(),
    ]);

      const lotsFeatureEnabled = parametres?.gestion_lots_stock_active ?? true;

  if (!fiche) notFound();

  return (
    <FicheManuelleDetail
      fiche={fiche as any}
      patients={(patients ?? []) as any}
      collaborateurs={(collaborateurs ?? []) as any}
      stockArticles={(stockArticles ?? []) as any}
      stockLots={(stockLots ?? []) as any}
      lotsFeatureEnabled={lotsFeatureEnabled}
    />
  );
}
