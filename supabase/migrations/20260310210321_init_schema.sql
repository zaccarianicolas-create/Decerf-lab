-- ============================================
-- DECERF LAB - Schéma de base de données
-- Laboratoire dentaire et orthodontique
-- ============================================

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'dentiste');
CREATE TYPE statut_commande AS ENUM (
  'brouillon',
  'en_attente',
  'acceptee',
  'en_cours',
  'controle_qualite',
  'terminee',
  'expediee',
  'livree',
  'annulee'
);
CREATE TYPE type_travail AS ENUM (
  'couronne',
  'bridge',
  'inlay_onlay',
  'facette',
  'prothese_amovible',
  'prothese_complete',
  'implant',
  'orthodontie',
  'gouttiere',
  'autre'
);
CREATE TYPE materiau AS ENUM (
  'zircone',
  'emax',
  'metal',
  'ceramique',
  'resine',
  'composite',
  'titane',
  'chrome_cobalt',
  'autre'
);
CREATE TYPE teinte AS ENUM (
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'BL1', 'BL2', 'BL3', 'BL4',
  'personnalisee'
);
CREATE TYPE statut_paiement AS ENUM (
  'en_attente',
  'paye',
  'echoue',
  'rembourse'
);
CREATE TYPE priorite AS ENUM ('normale', 'urgente', 'express');

-- ============================================
-- TABLE: profiles
-- Profils utilisateurs liés à auth.users
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  telephone TEXT,
  role user_role NOT NULL DEFAULT 'dentiste',
  avatar_url TEXT,
  cabinet_id UUID,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: cabinets
-- Cabinets dentaires des dentistes clients
-- ============================================

CREATE TABLE cabinets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  siret TEXT,
  numero_rpps TEXT,
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ajouter la foreign key cabinet_id sur profiles
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_cabinet
  FOREIGN KEY (cabinet_id) REFERENCES cabinets(id) ON DELETE SET NULL;

-- ============================================
-- TABLE: commandes
-- Commandes de travaux dentaires
-- ============================================

CREATE TABLE commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  patient_ref TEXT, -- Référence patient anonymisée
  statut statut_commande NOT NULL DEFAULT 'brouillon',
  priorite priorite NOT NULL DEFAULT 'normale',
  date_souhaitee DATE,
  date_livraison DATE,
  notes_dentiste TEXT,
  notes_labo TEXT,
  montant_total DECIMAL(10,2) DEFAULT 0,
  statut_paiement statut_paiement DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: commande_items
-- Détail des travaux dans chaque commande
-- ============================================

CREATE TABLE commande_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  type_travail type_travail NOT NULL,
  description TEXT,
  dents TEXT[], -- Ex: ['11', '12', '21']
  materiau materiau,
  teinte teinte,
  teinte_personnalisee TEXT,
  prix_unitaire DECIMAL(10,2),
  quantite INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: fichiers
-- Fichiers STL et documents liés aux commandes
-- ============================================

CREATE TABLE fichiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES commandes(id) ON DELETE CASCADE,
  nom_fichier TEXT NOT NULL,
  nom_original TEXT NOT NULL,
  type_mime TEXT,
  taille INTEGER, -- en bytes
  storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: conversations
-- Conversations entre dentistes et le labo
-- ============================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  titre TEXT,
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  derniere_activite TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: messages
-- Messages dans les conversations (realtime)
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  lu BOOLEAN NOT NULL DEFAULT false,
  fichier_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: protocoles
-- Protocoles et procédures du laboratoire
-- ============================================

CREATE TABLE protocoles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL,
  description TEXT,
  contenu TEXT, -- Contenu riche (markdown)
  categorie TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: paiements
-- Suivi des paiements Stripe
-- ============================================

CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  montant DECIMAL(10,2) NOT NULL,
  devise TEXT NOT NULL DEFAULT 'eur',
  statut statut_paiement NOT NULL DEFAULT 'en_attente',
  methode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: notifications
-- Notifications pour les utilisateurs
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, commande, message, paiement
  lue BOOLEAN NOT NULL DEFAULT false,
  lien TEXT, -- Lien vers la resource
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_cabinet ON profiles(cabinet_id);
CREATE INDEX idx_commandes_dentiste ON commandes(dentiste_id);
CREATE INDEX idx_commandes_statut ON commandes(statut);
CREATE INDEX idx_commandes_numero ON commandes(numero);
CREATE INDEX idx_commande_items_commande ON commande_items(commande_id);
CREATE INDEX idx_fichiers_commande ON fichiers(commande_id);
CREATE INDEX idx_conversations_dentiste ON conversations(dentiste_id);
CREATE INDEX idx_conversations_commande ON conversations(commande_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_auteur ON messages(auteur_id);
CREATE INDEX idx_paiements_commande ON paiements(commande_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_non_lues ON notifications(user_id) WHERE lue = false;

-- ============================================
-- FONCTIONS
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_cabinets_updated_at
  BEFORE UPDATE ON cabinets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_commandes_updated_at
  BEFORE UPDATE ON commandes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_protocoles_updated_at
  BEFORE UPDATE ON protocoles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_paiements_updated_at
  BEFORE UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction pour générer un numéro de commande automatique
CREATE OR REPLACE FUNCTION generate_numero_commande()
RETURNS TRIGGER AS $$
DECLARE
  annee TEXT;
  prochain_num INTEGER;
BEGIN
  annee := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 6) AS INTEGER)), 0) + 1
    INTO prochain_num
    FROM commandes
    WHERE numero LIKE 'DL-' || annee || '-%';
  NEW.numero := 'DL-' || annee || '-' || LPAD(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_commandes_numero
  BEFORE INSERT ON commandes
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION generate_numero_commande();

-- Fonction pour créer le profil après inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'dentiste')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: créer le profil automatiquement à l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fonction pour mettre à jour derniere_activite d'une conversation
CREATE OR REPLACE FUNCTION update_conversation_activite()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
    SET derniere_activite = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_messages_conversation_activite
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_activite();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
-- Tout le monde peut voir les profils (pour le chat, etc.)
CREATE POLICY "Profils visibles par les utilisateurs authentifiés"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Un utilisateur peut modifier son propre profil
CREATE POLICY "Modifier son propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Les admins peuvent tout modifier
CREATE POLICY "Admin peut tout modifier sur profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- CABINETS ----
CREATE POLICY "Cabinets visibles par authentifiés"
  ON cabinets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin gère les cabinets"
  ON cabinets FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Le dentiste peut modifier son cabinet
CREATE POLICY "Dentiste modifie son cabinet"
  ON cabinets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cabinet_id = cabinets.id)
  );

-- ---- COMMANDES ----
-- Le dentiste voit ses commandes
CREATE POLICY "Dentiste voit ses commandes"
  ON commandes FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Le dentiste crée des commandes
CREATE POLICY "Dentiste crée des commandes"
  ON commandes FOR INSERT
  TO authenticated
  WITH CHECK (dentiste_id = auth.uid());

-- Le dentiste modifie ses commandes en brouillon
CREATE POLICY "Dentiste modifie ses brouillons"
  ON commandes FOR UPDATE
  TO authenticated
  USING (
    (dentiste_id = auth.uid() AND statut = 'brouillon')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin peut supprimer
CREATE POLICY "Admin supprime commandes"
  ON commandes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- COMMANDE_ITEMS ----
CREATE POLICY "Voir items de ses commandes"
  ON commande_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = commande_items.commande_id
      AND (commandes.dentiste_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Gérer items de ses brouillons"
  ON commande_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = commande_items.commande_id
      AND (
        (commandes.dentiste_id = auth.uid() AND commandes.statut = 'brouillon')
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

-- ---- FICHIERS ----
CREATE POLICY "Voir fichiers de ses commandes"
  ON fichiers FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = fichiers.commande_id
      AND (commandes.dentiste_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Upload fichiers"
  ON fichiers FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admin gère fichiers"
  ON fichiers FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- CONVERSATIONS ----
CREATE POLICY "Voir ses conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Créer conversation"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (dentiste_id = auth.uid());

-- ---- MESSAGES ----
CREATE POLICY "Voir messages de ses conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.dentiste_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Envoyer messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auteur_id = auth.uid());

-- ---- PROTOCOLES ----
CREATE POLICY "Protocoles visibles par tous"
  ON protocoles FOR SELECT
  TO authenticated
  USING (actif = true);

CREATE POLICY "Admin gère protocoles"
  ON protocoles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- PAIEMENTS ----
CREATE POLICY "Voir ses paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = paiements.commande_id
      AND (commandes.dentiste_id = auth.uid()
           OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Admin gère paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---- NOTIFICATIONS ----
CREATE POLICY "Voir ses notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Marquer ses notifications lues"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin crée notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR user_id = auth.uid()
  );

-- ============================================
-- REALTIME - Activer pour les messages
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE commandes;

-- ============================================
-- STORAGE BUCKETS (créés via l'API)
-- On les crée dans un second temps
-- ============================================
