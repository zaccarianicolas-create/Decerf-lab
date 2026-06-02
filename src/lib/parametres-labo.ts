/**
 * Helper de lecture des paramètres labo (côté serveur).
 * Toujours retourne un objet (valeurs par défaut si rien).
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type ParametresLabo = {
  id?: string;
  nom_labo: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
  telephone: string | null;
  email_contact: string | null;
  site_web: string | null;
  tva_numero: string | null;
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
  nom_labo: "DECERF LAB",
  adresse: null,
  code_postal: null,
  ville: null,
  pays: "Belgique",
  telephone: null,
  email_contact: null,
  site_web: null,
  tva_numero: null,
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

export function invalidateParametresCache() {
  cache = null;
}
