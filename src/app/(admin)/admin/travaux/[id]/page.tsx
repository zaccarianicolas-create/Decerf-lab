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
      certificat:certificats_conformite(*)
    `
    )
    .eq("id", id)
    .single();

  if (!commande) notFound();

  // Le certificat est un array, prendre le premier
  const certificat = Array.isArray(commande.certificat)
    ? commande.certificat[0] || null
    : commande.certificat;

  return (
    <TravailDetail
      commande={{ ...commande, certificat }}
      currentUserId={user.id}
    />
  );
}
