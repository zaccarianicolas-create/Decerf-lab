/**
 * Helper de lecture des paramètres labo (côté serveur).
 * Toujours retourne un objet (valeurs par défaut si rien).
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type ParametresLabo = {
  id?: string;
  nom_labo: string;
  titulaire_legal: string;
  forme_juridique: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  email_contact: string | null;
  site_web: string | null;
  numero_entreprise: string | null;
  tva_numero: string | null;
  regime_tva: "franchise" | "normal";
  date_debut_regime_tva: string;
  mention_franchise_tva: string;
  numero_agrement: string | null;
  iban: string | null;
  bic: string | null;
  logo_url: string | null;
  signature_url: string | null;
  couleur_primaire: string;
  taux_tva_defaut: number;
  mentions_legales_facture: string | null;
  mentions_legales_certificat: string | null;
  conditions_paiement: string | null;
  horaires: string | null;
  prefixe_facture: string;
  prefixe_certificat: string;
  prefixe_devis: string;
};

const DEFAULTS: ParametresLabo = {
  nom_labo: "Decerf lab",
  titulaire_legal: "Julie Decerf",
  forme_juridique: "Personne physique",
  adresse: "Rue des Claveaux 1",
  code_postal: "4560",
  ville: "Clavier",
  pays: "Belgique",
  telephone: null,
  email_contact: "contact@decerf-lab.be",
  site_web: "https://www.decerf-lab.be",
  numero_entreprise: null,
  tva_numero: null,
  regime_tva: "franchise",
  date_debut_regime_tva: "2027-01-01",
  mention_franchise_tva: "Régime particulier de franchise des petites entreprises",
  numero_agrement: null,
  iban: null,
  bic: null,
  logo_url: null,
  signature_url: null,
  couleur_primaire: "#0284c7",
  taux_tva_defaut: 21,
  mentions_legales_facture: null,
  mentions_legales_certificat: null,
  conditions_paiement: "Paiement à 30 jours",
  horaires: null,
  prefixe_facture: "FA",
  prefixe_certificat: "CC",
  prefixe_devis: "DV",
};

let cache: { data: ParametresLabo; at: number } | null = null;

export async function getParametresLabo(): Promise<ParametresLabo> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("parametres_labo")
      .select("*")
      .limit(1)
      .maybeSingle();
    const merged = { ...DEFAULTS, ...(data ?? {}) } as ParametresLabo;
    cache = { data: merged, at: Date.now() };
    return merged;
  } catch {
    return DEFAULTS;
  }
}

export function formatAdresseLabo(
  params: Pick<ParametresLabo, "adresse" | "code_postal" | "ville" | "pays">
) {
  const rue = params.adresse?.trim();
  const codePostal = params.code_postal?.trim();
  const ville = params.ville?.trim();
  if (!rue || !codePostal || !ville) return null;
  return [rue, `${codePostal} ${ville}`, params.pays?.trim()]
    .filter(Boolean)
    .join(", ");
}

export function invalidateParametresCache() {
  cache = null;
}
