import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificatModelesManager } from "./certificat-modeles-manager";
import { formatAdresseLabo, getParametresLabo } from "@/lib/parametres-labo";

export default async function CertificatModelesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("certificat_modeles")
    .select("id, code, nom, description, contenu_template, version, est_defaut, actif")
    .order("created_at", { ascending: false });

  const labo = await getParametresLabo();
  const adresse = formatAdresseLabo(labo) || "Adresse du laboratoire à compléter";

  return (
    <CertificatModelesManager
      initialTemplates={data ?? []}
      laboratoryPreview={{
        nom: labo.nom_labo,
        adresse,
        site_fabrication: adresse,
      }}
    />
  );
}
