import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ServicesList } from "./services-list";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: services } = await admin
    .from("services_labo")
    .select("*")
    .order("ordre", { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Services du laboratoire
        </h1>
        <p className="text-sm text-gray-500">
          Gérez les travaux et services proposés aux praticiens
        </p>
      </div>
      <ServicesList initialServices={services ?? []} />
    </div>
  );
}
