import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { FichesManuellsList } from "./fiches-list";

export default async function AdminFichesManuellsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: fiches }, { data: patients }, { data: collaborateurs }] =
    await Promise.all([
      admin
        .from("fiches_manuelles")
        .select(
          `id, numero, titre, statut, priorite, date_echeance, items, created_at,
           patient:patients(id, reference, nom, prenom),
           dentiste:profiles!fiches_manuelles_dentiste_id_fkey(id, nom, prenom),
           assignee:profiles!fiches_manuelles_assignee_id_fkey(id, nom, prenom)`
        )
        .order("created_at", { ascending: false }),
      admin
        .from("patients")
        .select("id, reference, nom, prenom")
        .eq("actif", true)
        .order("nom"),
      admin
        .from("profiles")
        .select("id, nom, prenom, role_labo")
        .order("nom"),
    ]);

  return (
    <FichesManuellsList
      initialFiches={(fiches ?? []) as any}
      patients={(patients ?? []) as any}
      collaborateurs={(collaborateurs ?? []) as any}
    />
  );
}
