import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ParametresForm } from "./parametres-form";
import { BrandingPanel } from "./branding-panel";

export const dynamic = "force-dynamic";

export default async function AdminParametresPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Charger le profil admin
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Stats générales
  const { count: totalClients } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "dentiste");

  const { count: totalCommandes } = await admin
    .from("commandes")
    .select("*", { count: "exact", head: true });

  const { count: totalProtocoles } = await admin
    .from("protocoles")
    .select("*", { count: "exact", head: true });

  const { data: parametres } = await admin
    .from("parametres_labo")
    .select("*")
    .limit(1)
    .maybeSingle();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500">Configuration du laboratoire</p>
      </div>

      <ParametresForm
        profile={profile}
        stats={{
          totalClients: totalClients ?? 0,
          totalCommandes: totalCommandes ?? 0,
          totalProtocoles: totalProtocoles ?? 0,
        }}
      />

      <div className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-gray-900">Branding & identité labo</h2>
        <BrandingPanel initial={parametres} />
      </div>
    </div>
  );
}
