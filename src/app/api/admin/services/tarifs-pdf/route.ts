import { readFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getParametresLabo } from "@/lib/parametres-labo";
import { createTarifsPdf } from "@/lib/tarifs-pdf";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const [{ data: services, error: servicesError }, { data: tariffs, error: tariffsError }, { data: options, error: optionsError }, { data: catalogOptions, error: catalogError }] = await Promise.all([
    admin
      .from("services_labo")
      .select("id, nom, categorie, description, ordre")
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

  if (servicesError || tariffsError || optionsError || catalogError) {
    return NextResponse.json({
      error: servicesError?.message || tariffsError?.message || optionsError?.message || catalogError?.message || "Impossible de charger les tarifs.",
    }, { status: 500 });
  }

  const tariffByService = new Map(
    (tariffs ?? []).map((tariff) => [tariff.service_id, Number(tariff.prix_base_ht)])
  );
  const categoryLabels = new Map((catalogOptions ?? []).map((option) => [option.value, option.label]));
  const optionsByService = new Map<string, { nom: string; prix_ht: number }[]>();
  for (const option of options ?? []) {
    const serviceOptions = optionsByService.get(option.service_id) ?? [];
    serviceOptions.push({ nom: option.nom, prix_ht: Number(option.prix_ht) });
    optionsByService.set(option.service_id, serviceOptions);
  }

  const catalog = (services ?? []).map((service) => ({
    nom: service.nom,
    categorie: service.categorie,
    categorie_label: categoryLabels.get(service.categorie) || service.categorie,
    description: service.description,
    prix_base_ht: tariffByService.get(service.id) ?? null,
    options: optionsByService.get(service.id) ?? [],
  }));
  const params = await getParametresLabo();
  const logo = await readFile(join(process.cwd(), "public", "images", "logodecerflabslogan.png"));
  const siteUrl = params.site_web?.trim() || null;
  const qrCode = siteUrl
    ? await QRCode.toBuffer(siteUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      })
    : null;
  const pdf = await createTarifsPdf(params, catalog, logo, qrCode);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"tarifs-decerf-lab.pdf\"",
      "Cache-Control": "private, no-store",
    },
  });
}
