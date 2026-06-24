-- ============================================================
-- STEP 20 — Fiches de travaux manuelles (sans commande)
-- Permet au labo de créer des ordres de travail internes
-- sans nécessiter une commande d'un dentiste
-- ============================================================

-- Compteur auto pour les numéros FT-XXXXX
CREATE SEQUENCE IF NOT EXISTS fiches_manuelles_numero_seq START 1;

CREATE TABLE fiches_manuelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE DEFAULT ('FM-' || LPAD(nextval('fiches_manuelles_numero_seq')::TEXT, 5, '0')),

  -- Identification
  titre TEXT NOT NULL,
  description TEXT,

  -- Liens optionnels
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  dentiste_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Travaux à réaliser (même structure que commande_items)
  items JSONB NOT NULL DEFAULT '[]',
  -- ex: [{"type_travail":"couronne","materiau":"zircone","teinte":"A2","dents":["14","15"],"notes":"..."}]

  -- Statut et priorité
  statut TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','en_cours','controle_qualite','terminee','annulee')),
  priorite TEXT NOT NULL DEFAULT 'normale'
    CHECK (priorite IN ('basse','normale','haute','urgente')),

  -- Assignation principale
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Planification
  date_echeance DATE,

  -- Notes internes
  notes_internes TEXT,

  -- Méta
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_fiches_manuelles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fiches_manuelles_updated_at
  BEFORE UPDATE ON fiches_manuelles
  FOR EACH ROW EXECUTE FUNCTION update_fiches_manuelles_updated_at();

-- Index
CREATE INDEX idx_fiches_manuelles_patient ON fiches_manuelles(patient_id);
CREATE INDEX idx_fiches_manuelles_dentiste ON fiches_manuelles(dentiste_id);
CREATE INDEX idx_fiches_manuelles_statut ON fiches_manuelles(statut);
CREATE INDEX idx_fiches_manuelles_assignee ON fiches_manuelles(assignee_id);
CREATE INDEX idx_fiches_manuelles_created_at ON fiches_manuelles(created_at DESC);

-- RLS
ALTER TABLE fiches_manuelles ENABLE ROW LEVEL SECURITY;

-- Admins ont accès total
CREATE POLICY "admin_fiches_manuelles_all"
  ON fiches_manuelles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Collaborateurs peuvent voir les fiches qui leur sont assignées
CREATE POLICY "assignee_fiches_manuelles_select"
  ON fiches_manuelles FOR SELECT
  TO authenticated
  USING (assignee_id = auth.uid());

-- Historique des événements (workflow) pour fiches manuelles
CREATE TABLE fiche_manuelle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id UUID NOT NULL REFERENCES fiches_manuelles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'creation','statut_change','note','assignation'
  payload JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fiche_manuelle_events_fiche ON fiche_manuelle_events(fiche_id);

ALTER TABLE fiche_manuelle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_fiche_events_all"
  ON fiche_manuelle_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
