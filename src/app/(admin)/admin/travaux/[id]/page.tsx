import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { TravailDetail } from "./travail-detail";

export default async function AdminTravailPage({
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

  const { data: commande } = await admin
    .from("commandes")
    .select(
      `
      *,
      patient:patients(*),
      dentiste:profiles!commandes_dentiste_id_fkey(id, nom, prenom, email, numero_inami, telephone),
      items:commande_items(*),
      fichiers:fichiers(*),
      certificat:certificats_conformite(*),
      workflow_events:commande_workflow_events(*),
      notes_techniques:commande_notes(*),
      qc_checks:commande_qc_checks(*)
    `
    )
    .eq("id", id)
    .single();

  if (!commande) notFound();

  // Le certificat est un array, prendre le premier
  const certificat = Array.isArray(commande.certificat)
    ? commande.certificat[0] || null
    : commande.certificat;

  const { data: orthoDossier } = await admin
    .from("commande_ortho")
    .select("*, etapes:commande_ortho_etapes(*)")
    .eq("commande_id", id)
    .maybeSingle();

  const ortho = orthoDossier
    ? {
        ...orthoDossier,
        etapes: ((orthoDossier as any).etapes || []).sort(
          (a: any, b: any) => a.numero - b.numero
        ),
      }
    : null;

  const [
    { data: assignations },
    { data: taches },
    { data: collaborateurs },
    { data: protocoles },
    { data: protocoleInstances },
    { data: stockArticles },
    { data: stockLots },
    { data: parametres },
  ] = await Promise.all([
      admin
        .from("commande_assignations")
        .select("id, technicien_id, role")
        .eq("commande_id", id),
      admin
        .from("commande_taches")
        .select(
          "id, titre, description, assignee_id, statut, priorite, due_date"
        )
        .eq("commande_id", id)
        .order("created_at", { ascending: true }),
      admin
        .from("profiles")
        .select("id, nom, prenom, role_labo")
        .eq("role", "technicien")
        .eq("actif_collaborateur", true)
        .order("prenom", { ascending: true }),
      admin
        .from("protocoles")
        .select("id, titre, type_protocole, type_travail, version, template_sections")
        .eq("actif", true)
        .order("ordre", { ascending: true }),
      admin
        .from("protocole_instances")
        .select("id, titre, type_protocole, type_travail, version, statut, sections, created_at")
        .eq("commande_id", id)
        .order("created_at", { ascending: false }),
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

  return (
    <TravailDetail
      commande={{
        ...commande,
        certificat,
        ortho,
        assignations: assignations ?? [],
        taches: taches ?? [],
        collaborateurs: collaborateurs ?? [],
      }}
      currentUserId={user.id}
      protocoles={protocoles ?? []}
      protocoleInstances={protocoleInstances ?? []}
      stockArticles={stockArticles ?? []}
      stockLots={stockLots ?? []}
      lotsFeatureEnabled={lotsFeatureEnabled}
    />
  );
}
