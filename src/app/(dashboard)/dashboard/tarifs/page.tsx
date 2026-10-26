import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function TarifsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "dentiste") redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: services }, { data: tarifs }, { data: options }, { data: catalogOptions }] = await Promise.all([
    admin
      .from("services_labo")
      .select("id, nom, description, categorie, ordre")
      .eq("actif", true)
      .order("ordre"),
    admin.from("service_tarifs").select("service_id, prix_base_ht"),
    admin
      .from("service_options")
      .select("id, service_id, nom, prix_ht, ordre")
      .eq("actif", true)
      .order("ordre"),
    admin
      .from("service_catalog_options")
      .select("value, label")
      .eq("kind", "categorie")
      .eq("actif", true),
  ]);
  const categoryLabels = new Map((catalogOptions ?? []).map((category) => [category.value, category.label]));

  const tarifsParService = new Map(
    (tarifs ?? []).map((tarif) => [tarif.service_id, Number(tarif.prix_base_ht)])
  );
  const optionsParService = new Map<string, NonNullable<typeof options>>();
  for (const option of options ?? []) {
    const serviceOptions = optionsParService.get(option.service_id) ?? [];
    serviceOptions.push(option);
    optionsParService.set(option.service_id, serviceOptions);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Tarifs</h1>
        <p className="mt-1 text-sm text-gray-500">Tarifs hors TVA</p>
      </header>

      {services?.length ? (
        <div className="space-y-4">
          {services.map((service) => {
            const serviceOptions = optionsParService.get(service.id) ?? [];
            return (
              <Card key={service.id}>
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <p className="text-xs font-medium uppercase text-sky-700">
                        {categoryLabels.get(service.categorie) ?? service.categorie}
                      </p>
                      <h2 className="mt-1 font-semibold text-gray-900">{service.nom}</h2>
                      {service.description && (
                        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                      )}
                    </div>
                    <p className="whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {tarifsParService.has(service.id)
                        ? `${tarifsParService.get(service.id)!.toFixed(2)} € HT`
                        : "Sur devis"}
                    </p>
                  </div>

                  {serviceOptions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h3 className="text-xs font-medium uppercase text-gray-500">
                        Options facturables
                      </h3>
                      {serviceOptions.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="text-gray-700">{option.nom}</span>
                          <span className="whitespace-nowrap font-medium text-gray-900">
                            + {Number(option.prix_ht).toFixed(2)} € HT
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">
            Aucun tarif disponible.
          </CardContent>
        </Card>
      )}
    </div>
  );
}