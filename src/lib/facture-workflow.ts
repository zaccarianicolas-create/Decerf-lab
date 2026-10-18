import { createAdminClient } from "@/lib/supabase/admin";
import { getParametresLabo } from "@/lib/parametres-labo";

type AdminClient = ReturnType<typeof createAdminClient>;

export type FactureBillingSnapshot = {
  version: 1;
  taux_tva: number;
  issuer: {
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
    tva_numero: string;
    iban: string;
    bic: string;
    conditions_paiement: string;
    mentions_legales: string;
    logo_url: string;
  };
  client: {
    nom: string;
    prenom: string;
    email: string;
    adresse: string;
    tva_numero: string;
  };
  commande_numero: string;
  patient_ref: string;
  items: {
    commande_item_id: string;
    service_id: string | null;
    service_nom: string;
    description: string;
    quantite: number;
    prix_base_ht: number;
    options: { id: string; nom: string; prix_ht: number }[];
  }[];
};

export async function createFactureDraft(
  admin: AdminClient,
  commandeId: string,
  createdBy: string
): Promise<{ factureId?: string; error?: string }> {
  const { data: existingFacture, error: existingError } = await admin
    .from("factures")
    .select("id")
    .eq("commande_id", commandeId)
    .limit(1)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (existingFacture) return { factureId: existingFacture.id };

  const { data: commande, error: commandeError } = await admin
    .from("commandes")
    .select(
      "id, numero, dentiste_id, cabinet_id, patient_ref, items:commande_items(id, service_labo_id, type_travail, description, quantite, prix_unitaire, service:services_labo(id, nom))"
    )
    .eq("id", commandeId)
    .single();

  if (commandeError || !commande) {
    return { error: commandeError?.message || "Commande introuvable" };
  }

  const items = commande.items ?? [];
  if (items.length === 0) return { error: "Cette commande ne contient aucun travail." };

  const serviceIds = [...new Set(items.flatMap((item) => item.service_labo_id ? [item.service_labo_id] : []))];
  const [{ data: tariffs, error: tariffsError }, { data: options, error: optionsError }, { data: dentist, error: dentistError }] = await Promise.all([
    serviceIds.length
      ? admin.from("service_tarifs").select("service_id, prix_base_ht").in("service_id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? admin.from("service_options").select("id, service_id, nom, prix_ht").eq("actif", true).in("service_id", serviceIds).order("ordre")
      : Promise.resolve({ data: [], error: null }),
    admin.from("profiles").select("nom, prenom, email, cabinet_id").eq("id", commande.dentiste_id).single(),
  ]);

  if (tariffsError || optionsError || dentistError) {
    return { error: tariffsError?.message || optionsError?.message || dentistError?.message || "Impossible de charger les données de facturation." };
  }

  const tariffByService = new Map((tariffs ?? []).map((tariff) => [tariff.service_id, Number(tariff.prix_base_ht)]));
  const optionsByService = new Map<string, typeof options>();
  for (const option of options ?? []) {
    const serviceOptions = optionsByService.get(option.service_id) ?? [];
    serviceOptions.push(option);
    optionsByService.set(option.service_id, serviceOptions);
  }

  const snapshotItems: FactureBillingSnapshot["items"] = [];
  for (const item of items) {
    const service = Array.isArray(item.service) ? item.service[0] : item.service;
    const basePrice = item.service_labo_id
      ? tariffByService.get(item.service_labo_id)
      : undefined;
    if (basePrice === undefined) {
      return {
        error: `Aucun service tarifé associé à ${service?.nom || item.type_travail}. Associe un service du catalogue avant de terminer le travail.`,
      };
    }

    snapshotItems.push({
      commande_item_id: item.id,
      service_id: item.service_labo_id,
      service_nom: service?.nom || String(item.type_travail).replace(/_/g, " "),
      description: item.description?.trim() || service?.nom || String(item.type_travail).replace(/_/g, " "),
      quantite: Math.max(1, Number(item.quantite || 1)),
      prix_base_ht: basePrice,
      options: (item.service_labo_id ? optionsByService.get(item.service_labo_id) ?? [] : []).map((option) => ({
        id: option.id,
        nom: option.nom,
        prix_ht: Number(option.prix_ht),
      })),
    });
  }

  const params = await getParametresLabo();
  const cabinetId = dentist?.cabinet_id || commande.cabinet_id;
  const { data: cabinet } = cabinetId
    ? await admin.from("cabinets").select("nom, adresse, code_postal, ville, tva_numero").eq("id", cabinetId).maybeSingle()
    : { data: null };
  const adresseLabo = [params.adresse, params.code_postal, params.ville, params.pays].filter(Boolean).join(", ");
  const adresseCabinet = [cabinet?.adresse, cabinet?.code_postal, cabinet?.ville].filter(Boolean).join(", ");

  const snapshot: FactureBillingSnapshot = {
    version: 1,
    taux_tva: Number(params.taux_tva_defaut ?? 21),
    issuer: {
      nom: params.nom_labo,
      adresse: adresseLabo,
      telephone: params.telephone ?? "",
      email: params.email_contact ?? "",
      tva_numero: params.tva_numero ?? "",
      iban: params.iban ?? "",
      bic: params.bic ?? "",
      conditions_paiement: params.conditions_paiement ?? "Paiement à 30 jours",
      mentions_legales: params.mentions_legales_facture ?? "",
      logo_url: params.logo_url ?? "",
    },
    client: {
      nom: [dentist?.prenom, dentist?.nom].filter(Boolean).join(" "),
      prenom: dentist?.prenom ?? "",
      email: dentist?.email ?? "",
      adresse: [cabinet?.nom, adresseCabinet].filter(Boolean).join(" — "),
      tva_numero: cabinet?.tva_numero ?? "",
    },
    commande_numero: commande.numero,
    patient_ref: commande.patient_ref ?? "",
    items: snapshotItems,
  };

  const { data: facture, error: factureError } = await admin
    .from("factures")
    .insert({
      dentiste_id: commande.dentiste_id,
      cabinet_id: cabinetId,
      commande_id: commande.id,
      statut: "brouillon",
      montant_ht: 0,
      montant_tva: 0,
      montant_ttc: 0,
      solde_du: 0,
      devise: "eur",
      notes: `Commande ${commande.numero}`,
      billing_snapshot: snapshot,
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (factureError || !facture) {
    const { data: racedFacture } = await admin
      .from("factures")
      .select("id")
      .eq("commande_id", commandeId)
      .limit(1)
      .maybeSingle();
    return racedFacture
      ? { factureId: racedFacture.id }
      : { error: factureError?.message || "Impossible de créer le brouillon de facture." };
  }

  return { factureId: facture.id };
}