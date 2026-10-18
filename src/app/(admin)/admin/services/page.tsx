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

  const [{ data: services }, { data: tarifs }, { data: options }] = await Promise.all([
    admin.from("services_labo").select("*").order("ordre", { ascending: true }),
    admin.from("service_tarifs").select("service_id, prix_base_ht"),
    admin.from("service_options").select("*").order("ordre"),
  ]);
  const tarifsParService = new Map(
    (tarifs ?? []).map((tarif) => [tarif.service_id, tarif.prix_base_ht])
  );
  const optionsParService = new Map<string, NonNullable<typeof options>>();
  for (const option of options ?? []) {
    const serviceOptions = optionsParService.get(option.service_id) ?? [];
    serviceOptions.push(option);
    optionsParService.set(option.service_id, serviceOptions);
  }
  const servicesAvecTarifs = (services ?? []).map((service) => ({
    ...service,
    prix_base_ht: tarifsParService.get(service.id) ?? null,
    options: optionsParService.get(service.id) ?? [],
  }));

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
      <ServicesList initialServices={servicesAvecTarifs} />
    </div>
  );
}
