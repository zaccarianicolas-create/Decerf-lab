import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CommandeDetail } from "./commande-detail";

export default async function DashboardCommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "*, patient:patients(*), items:commande_items(*), fichiers:fichiers(*), certificats:certificats_conformite(*)"
    )
    .eq("id", id)
    .eq("dentiste_id", user.id)
    .single();

  if (!commande) notFound();

  // Normalize certificat
  const certificat =
    Array.isArray(commande.certificats) && commande.certificats.length > 0
      ? commande.certificats[0]
      : null;

  return (
    <CommandeDetail
      commande={{ ...commande, certificat }}
    />
  );
}
