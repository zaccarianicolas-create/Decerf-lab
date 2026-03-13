-- ============================================
-- DECERF LAB - Services du laboratoire
-- Table pour gérer les travaux/services offerts
-- ============================================

-- Catégories de services
CREATE TYPE categorie_service AS ENUM (
  'prothese_fixe',
  'prothese_amovible',
  'implantologie',
  'orthodontie',
  'esthetique',
  'autre'
);

-- Mode de fourniture (comment le praticien envoie le travail)
CREATE TYPE mode_fourniture AS ENUM (
  'numerique_stl',
  'empreinte_physique',
  'les_deux'
);

-- Table principale des services
CREATE TABLE services_labo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  categorie categorie_service NOT NULL DEFAULT 'autre',
  type_travail type_travail, -- lien vers l'enum existant (optionnel)
  materiaux_disponibles materiau[] DEFAULT '{}', -- matériaux proposés pour ce service
  mode_fourniture mode_fourniture NOT NULL DEFAULT 'les_deux',
  prix_indicatif DECIMAL(10,2),
  duree_estimee_jours INTEGER,
  instructions TEXT, -- instructions spécifiques pour ce service
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0, -- pour trier l'affichage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE TRIGGER set_services_labo_updated_at
  BEFORE UPDATE ON services_labo
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE services_labo ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les services actifs
CREATE POLICY "services_labo_select_all"
  ON services_labo FOR SELECT
  USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "services_labo_admin_all"
  ON services_labo FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Lien optionnel entre commande_items et services
ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS service_labo_id UUID REFERENCES services_labo(id) ON DELETE SET NULL;

-- Données initiales : les services courants d'un labo dentaire
INSERT INTO services_labo (nom, description, categorie, type_travail, materiaux_disponibles, mode_fourniture, prix_indicatif, duree_estimee_jours, ordre) VALUES
  ('Couronne unitaire', 'Couronne céramo-métallique ou tout-céramique', 'prothese_fixe', 'couronne', '{zircone,emax,metal,ceramique}', 'les_deux', 250.00, 7, 1),
  ('Bridge', 'Bridge de 3 éléments ou plus', 'prothese_fixe', 'bridge', '{zircone,emax,metal,ceramique}', 'les_deux', 450.00, 10, 2),
  ('Inlay / Onlay', 'Restauration partielle en céramique ou composite', 'prothese_fixe', 'inlay_onlay', '{emax,ceramique,composite,zircone}', 'les_deux', 200.00, 7, 3),
  ('Facette', 'Facette esthétique en céramique', 'esthetique', 'facette', '{emax,ceramique}', 'les_deux', 300.00, 7, 4),
  ('Prothèse amovible partielle', 'Prothèse amovible avec crochets', 'prothese_amovible', 'prothese_amovible', '{resine,chrome_cobalt}', 'empreinte_physique', 350.00, 14, 5),
  ('Prothèse complète', 'Prothèse amovible complète maxillaire ou mandibulaire', 'prothese_amovible', 'prothese_complete', '{resine}', 'empreinte_physique', 500.00, 14, 6),
  ('Couronne sur implant', 'Couronne vissée ou scellée sur implant', 'implantologie', 'implant', '{zircone,emax,titane}', 'les_deux', 400.00, 10, 7),
  ('Appareil orthodontique', 'Appareil amovible ou contention', 'orthodontie', 'orthodontie', '{resine}', 'empreinte_physique', 200.00, 10, 8),
  ('Gouttière', 'Gouttière occlusale ou de blanchiment', 'orthodontie', 'gouttiere', '{resine}', 'les_deux', 150.00, 5, 9);

-- Publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE services_labo;
