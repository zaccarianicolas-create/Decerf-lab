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

  return (
    <TravailDetail
      commande={{ ...commande, certificat, ortho }}
      currentUserId={user.id}
    />
  );
}
