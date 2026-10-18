import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificatModelesManager } from "./certificat-modeles-manager";

export default async function CertificatModelesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("certificat_modeles")
    .select("id, code, nom, description, contenu_template, version, est_defaut, actif")
    .order("created_at", { ascending: false });

  return <CertificatModelesManager initialTemplates={data ?? []} />;
}
