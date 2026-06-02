import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AdminPatientsList } from "./patients-list";

export default async function AdminPatientsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: patients }, { data: dentistes }] = await Promise.all([
    admin
      .from("patients")
      .select(
        "id, reference, nom, prenom, date_naissance, sexe, telephone, email, actif, archived_at, anonymized_at, dentiste_id, created_at, dentiste:profiles!dentiste_id(id, nom, prenom, sans_compte, cabinet:cabinets(nom))"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, nom, prenom, sans_compte, cabinet:cabinets(nom)")
      .eq("role", "dentiste")
      .eq("actif", true)
      .order("nom"),
  ]);

  // Count commandes per patient
  const ids = (patients ?? []).map((p) => p.id);
  const counts: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: cmds } = await admin
      .from("commandes")
      .select("patient_id")
      .in("patient_id", ids);
    for (const c of cmds ?? []) {
      if (c.patient_id) counts[c.patient_id] = (counts[c.patient_id] || 0) + 1;
    }
  }

  const enriched = (patients ?? []).map((p) => ({
    ...p,
    nb_commandes: counts[p.id] || 0,
  }));

  return (
    <AdminPatientsList
      initialPatients={enriched as any}
      dentistes={(dentistes ?? []) as any}
    />
  );
}
