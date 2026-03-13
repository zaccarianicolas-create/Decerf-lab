import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { TravauxList } from "./travaux-list";

export default async function AdminTravauxPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: commandes } = await admin
    .from("commandes")
    .select(
      `
      *,
      patient:patients(id, reference, nom, prenom),
      dentiste:profiles!commandes_dentiste_id_fkey(id, nom, prenom, email),
      items:commande_items(type_travail, dents, materiau, teinte)
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Travaux</h1>
        <p className="text-sm text-gray-500">
          Tous les travaux du laboratoire — gestion et suivi
        </p>
      </div>

      <TravauxList initialCommandes={commandes ?? []} />
    </div>
  );
}
