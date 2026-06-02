import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AtelierClient } from "./atelier-client";

export const dynamic = "force-dynamic";

export default async function AtelierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, role_labo, prenom, nom")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "technicien") {
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  const [{ data: assignations }, { data: taches }] = await Promise.all([
    admin
      .from("commande_assignations")
      .select(
        "id, role, assigned_at, commande:commandes(id, numero, statut, statut_paiement, date_livraison, patient_ref, patient:patients(prenom, nom))"
      )
      .eq("technicien_id", user.id)
      .order("assigned_at", { ascending: false }),
    admin
      .from("commande_taches")
      .select(
        "id, titre, description, statut, priorite, due_date, commande:commandes(id, numero, patient_ref)"
      )
      .eq("assignee_id", user.id)
      .order("statut", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  return (
    <AtelierClient
      profile={{
        nom: profile.nom,
        prenom: profile.prenom,
        role_labo: profile.role_labo,
      }}
      assignations={(assignations as any[]) ?? []}
      taches={(taches as any[]) ?? []}
    />
  );
}
