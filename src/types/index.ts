// ============================================
// DECERF LAB - Types TypeScript
// ============================================

export type UserRole = "admin" | "dentiste";
export type StatutCompte = "en_attente" | "approuve" | "rejete";

export type StatutCommande =
  | "brouillon"
  | "en_attente"
  | "acceptee"
  | "en_cours"
  | "controle_qualite"
  | "terminee"
  | "expediee"
  | "livree"
  | "annulee";

export type TypeTravail =
  | "couronne"
  | "bridge"
  | "inlay_onlay"
  | "facette"
  | "prothese_amovible"
  | "prothese_complete"
  | "implant"
  | "orthodontie"
  | "gouttiere"
  | "autre";

export type Materiau =
  | "zircone"
  | "emax"
  | "metal"
  | "ceramique"
  | "resine"
  | "composite"
  | "titane"
  | "chrome_cobalt"
  | "autre";

export type Teinte =
  | "A1" | "A2" | "A3" | "A3.5" | "A4"
  | "B1" | "B2" | "B3" | "B4"
  | "C1" | "C2" | "C3" | "C4"
  | "D2" | "D3" | "D4"
  | "BL1" | "BL2" | "BL3" | "BL4"
  | "personnalisee";

export type StatutPaiement = "en_attente" | "paye" | "echoue" | "rembourse";
export type Priorite = "normale" | "urgente" | "express";

// ============================================
// Database Row Types
// ============================================

export interface Profile {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: UserRole;
  avatar_url: string | null;
  cabinet_id: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Cabinet {
  id: string;
  nom: string;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  siret: string | null;
  numero_rpps: string | null;
  notes: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Commande {
  id: string;
  numero: string;
  dentiste_id: string;
  cabinet_id: string | null;
  patient_ref: string | null;
  statut: StatutCommande;
  priorite: Priorite;
  date_souhaitee: string | null;
  date_livraison: string | null;
  notes_dentiste: string | null;
  notes_labo: string | null;
  montant_total: number;
  statut_paiement: StatutPaiement;
  created_at: string;
  updated_at: string;
  // Relations
  dentiste?: Profile;
  cabinet?: Cabinet;
  items?: CommandeItem[];
  fichiers?: Fichier[];
}

export interface CommandeItem {
  id: string;
  commande_id: string;
  type_travail: TypeTravail;
  description: string | null;
  dents: string[] | null;
  materiau: Materiau | null;
  teinte: Teinte | null;
  teinte_personnalisee: string | null;
  prix_unitaire: number | null;
  quantite: number;
  notes: string | null;
  created_at: string;
}

export interface Fichier {
  id: string;
  commande_id: string | null;
  nom_fichier: string;
  nom_original: string;
  type_mime: string | null;
  taille: number | null;
  storage_path: string;
  uploaded_by: string;
  description: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  commande_id: string | null;
  titre: string | null;
  dentiste_id: string;
  derniere_activite: string;
  created_at: string;
  // Relations
  dentiste?: Profile;
  commande?: Commande;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  auteur_id: string;
  contenu: string;
  lu: boolean;
  fichier_url: string | null;
  created_at: string;
  // Relations
  auteur?: Profile;
}

export interface Protocole {
  id: string;
  titre: string;
  description: string | null;
  contenu: string | null;
  categorie: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export interface Paiement {
  id: string;
  commande_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  montant: number;
  devise: string;
  statut: StatutPaiement;
  methode: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  titre: string;
  message: string;
  type: string;
  lue: boolean;
  lien: string | null;
  created_at: string;
}

// ============================================
// Form Types
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  nom: string;
  prenom: string;
  telephone?: string;
  cabinet_nom?: string;
}

export interface CommandeFormData {
  patient_ref: string;
  priorite: Priorite;
  date_souhaitee: string;
  notes_dentiste: string;
  items: CommandeItemFormData[];
}

export interface CommandeItemFormData {
  type_travail: TypeTravail;
  description: string;
  dents: string[];
  materiau: Materiau;
  teinte: Teinte;
  teinte_personnalisee?: string;
  notes: string;
}

// ============================================
// UI Types
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

export interface DashboardStats {
  total_commandes: number;
  commandes_en_cours: number;
  commandes_terminees: number;
  messages_non_lus: number;
  chiffre_affaires: number;
}
