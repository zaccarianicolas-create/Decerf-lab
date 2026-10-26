import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRequestMeta, logAudit } from "@/lib/audit";

type WorkInput = {
  service_labo_id?: unknown;
  options_selectionnees?: unknown;
  description?: unknown;
  dents?: unknown;
  materiau?: unknown;
  teinte?: unknown;
  notes?: unknown;
  quantite?: unknown;
};

async function requireTechnicien() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, actif, actif_collaborateur")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "technicien" || !profile.actif || !profile.actif_collaborateur) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  return { admin, userId: user.id };
}

export async function POST(request: NextRequest) {
  const auth = await requireTechnicien();
  if (auth.error) return auth.error;
  const { admin, userId } = auth;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const dentistId = typeof body?.dentiste_id === "string" ? body.dentiste_id : "";
  const patientId = typeof body?.patient_id === "string" ? body.patient_id : null;
  const patientRef = typeof body?.patient_ref === "string" ? body.patient_ref.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const dateLivraison = typeof body?.date_livraison === "string" ? body.date_livraison : null;
  if (!dentistId) return NextResponse.json({ error: "Sélectionnez un dentiste." }, { status: 400 });
  if (!Array.isArray(body?.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Ajoutez au moins un travail." }, { status: 400 });
  }
  const items = body.items as WorkInput[];

  const { data: dentist } = await admin
    .from("profiles")
    .select("id, cabinet_id, role, actif")
    .eq("id", dentistId)
    .maybeSingle();
  if (!dentist || dentist.role !== "dentiste" || !dentist.actif) {
    return NextResponse.json({ error: "Dentiste introuvable ou inactif." }, { status: 404 });
  }

  if (patientId) {
    const { data: patient } = await admin
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("dentiste_id", dentistId)
      .eq("actif", true)
      .maybeSingle();
    if (!patient) return NextResponse.json({ error: "Ce patient n’est pas rattaché à ce dentiste." }, { status: 400 });
  }

  const serviceIds = items.map((item) => item.service_labo_id);
  if (serviceIds.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Service invalide." }, { status: 400 });
  }
  const ids = [...new Set(serviceIds as string[])];
  const [{ data: services, error: servicesError }, { data: tariffs, error: tariffsError }] = await Promise.all([
    admin.from("services_labo").select("id, nom, type_travail").eq("actif", true).in("id", ids),
    admin.from("service_tarifs").select("service_id, prix_base_ht").in("service_id", ids),
  ]);
  if (servicesError || tariffsError) {
    return NextResponse.json({ error: servicesError?.message || tariffsError?.message || "Impossible de charger le catalogue." }, { status: 500 });
  }

  const serviceById = new Map((services ?? []).map((service) => [service.id, service]));
  const tariffByService = new Map((tariffs ?? []).map((tariff) => [tariff.service_id, Number(tariff.prix_base_ht)]));
  const selectedIdsByItem: string[][] = [];
  const allOptionIds: string[] = [];
  for (const item of items) {
    const serviceId = item.service_labo_id as string;
    if (!serviceById.has(serviceId)) return NextResponse.json({ error: "Un service sélectionné est inactif ou introuvable." }, { status: 400 });
    if (tariffByService.get(serviceId) === undefined) {
      return NextResponse.json({ error: `Le tarif du service « ${serviceById.get(serviceId)?.nom} » doit être défini par un administrateur.` }, { status: 400 });
    }
    const rawOptionIds = item.options_selectionnees ?? [];
    if (!Array.isArray(rawOptionIds) || rawOptionIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "Sélection d’options invalide." }, { status: 400 });
    }
    const optionIds = rawOptionIds as string[];
    if (new Set(optionIds).size !== optionIds.length) return NextResponse.json({ error: "Options en double." }, { status: 400 });
    selectedIdsByItem.push(optionIds);
    allOptionIds.push(...optionIds);
    const quantity = Number(item.quantite ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
    }
  }

  const { data: options, error: optionsError } = allOptionIds.length
    ? await admin.from("service_options").select("id, service_id, prix_ht").eq("actif", true).in("id", [...new Set(allOptionIds)])
    : { data: [], error: null };
  if (optionsError) return NextResponse.json({ error: optionsError.message }, { status: 500 });
  const optionById = new Map((options ?? []).map((option) => [option.id, option]));

  for (let index = 0; index < items.length; index += 1) {
    const serviceId = items[index].service_labo_id as string;
    const optionIds = selectedIdsByItem[index];
    if (optionIds.some((id) => optionById.get(id)?.service_id !== serviceId)) {
      return NextResponse.json({ error: "Une option sélectionnée n’appartient pas au service choisi." }, { status: 400 });
    }
  }

  let total = 0;
  const itemsPayload = items.map((item, index) => {
    const serviceId = item.service_labo_id as string;
    const service = serviceById.get(serviceId)!;
    const optionIds = selectedIdsByItem[index];
    const selectedOptions = optionIds.map((id) => optionById.get(id)!);
    const basePrice = tariffByService.get(serviceId)!;
    const optionsPrice = selectedOptions.reduce((sum, option) => sum + Number(option.prix_ht), 0);
    const quantity = Number(item.quantite ?? 1);
    total += quantity * (basePrice + optionsPrice);
    const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
    const teeth = Array.isArray(item.dents)
      ? item.dents.filter((tooth): tooth is string => typeof tooth === "string" && tooth.trim().length > 0)
      : typeof item.dents === "string"
        ? item.dents.split(",").map((tooth) => tooth.trim()).filter(Boolean)
        : [];
    return {
      service_labo_id: serviceId,
      type_travail: service.type_travail || "autre",
      item_label: service.nom,
      description: text(item.description),
      quantite: quantity,
      prix_unitaire: basePrice,
      dents: teeth.length ? teeth : null,
      materiau: text(item.materiau),
      teinte: text(item.teinte),
      notes: text(item.notes),
      options_selectionnees: optionIds,
    };
  });

  const { data: order, error: orderError } = await admin
    .from("commandes")
    .insert({
      dentiste_id: dentistId,
      cabinet_id: dentist.cabinet_id,
      patient_id: patientId,
      patient_ref: patientRef || null,
      priorite: "normale",
      date_livraison: dateLivraison || null,
      notes_dentiste: notes || null,
      statut: "acceptee",
      montant_total: total,
      created_by: userId,
    })
    .select("id, numero")
    .single();
  if (orderError || !order) return NextResponse.json({ error: orderError?.message || "Création de commande impossible." }, { status: 400 });

  const { data: createdItems, error: itemsError } = await admin
    .from("commande_items")
    .insert(itemsPayload.map((item) => ({ ...item, commande_id: order.id })))
    .select("id");
  if (itemsError || !createdItems) {
    await admin.from("commandes").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError?.message || "Création des lignes impossible." }, { status: 400 });
  }

  const { error: assignmentError } = await admin.from("commande_assignations").insert({
    commande_id: order.id,
    technicien_id: userId,
    role: "responsable",
    assigned_by: userId,
  });
  if (assignmentError) {
    await admin.from("commandes").delete().eq("id", order.id);
    return NextResponse.json({ error: assignmentError.message }, { status: 400 });
  }

  const meta = extractRequestMeta(request);
  await logAudit({
    actor_id: userId,
    actor_role: "technicien",
    action: "commande.create.paper",
    entity_type: "commande",
    entity_id: order.id,
    metadata: { numero: order.numero, dentiste_id: dentistId, patient_id: patientId, items: createdItems.length },
    ip: meta.ip,
    user_agent: meta.user_agent,
  });

  return NextResponse.json({ commande: order }, { status: 201 });
}
