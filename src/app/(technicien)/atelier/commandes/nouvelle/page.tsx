import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TechnicienCommandeForm, type TechnicienCommandeService } from "./technicien-commande-form";

export const dynamic = "force-dynamic";

type DentistOption = { id: string; nom: string; prenom: string };
type OptionRow = { id: string; service_id: string; nom: string };

export default async function TechnicienNouvelleCommandePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, actif, actif_collaborateur")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "technicien" || !profile.actif || !profile.actif_collaborateur) {
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  const [{ data: dentists }, { data: services }, { data: options }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nom, prenom")
      .eq("role", "dentiste")
      .eq("actif", true)
      .eq("statut_compte", "approuve")
      .order("nom"),
    admin
      .from("services_labo")
      .select("id, nom, type_travail, materiaux_disponibles, demander_dents, demander_materiau, demander_teinte, demander_notes, instructions, duree_estimee_jours, mode_fourniture")
      .eq("actif", true)
      .order("ordre"),
    admin
      .from("service_options")
      .select("id, service_id, nom")
      .eq("actif", true)
      .order("ordre"),
  ]);

  const optionsByService = new Map<string, OptionRow[]>();
  for (const option of options ?? []) {
    const serviceOptions = optionsByService.get(option.service_id) ?? [];
    serviceOptions.push(option);
    optionsByService.set(option.service_id, serviceOptions);
  }

  const servicesForForm = (services ?? []).map((service) => ({
    ...service,
    options: optionsByService.get(service.id) ?? [],
  })) as TechnicienCommandeService[];

  return (
    <TechnicienCommandeForm
      dentists={(dentists ?? []) as DentistOption[]}
      services={servicesForForm}
    />
  );
}
