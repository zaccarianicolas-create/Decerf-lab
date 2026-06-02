-- ============================================
-- DECERF LAB - Etape 3: travaux V1
-- Pipeline, timeline, notes, QC, fichiers liés
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_event_type') THEN
    CREATE TYPE workflow_event_type AS ENUM (
      'reception',
      'information',
      'scan',
      'conception',
      'fabrication',
      'qc',
      'retouche',
      'livraison',
      'message',
      'note'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qc_check_result') THEN
    CREATE TYPE qc_check_result AS ENUM ('conforme', 'a_corriger', 'non_conforme');
  END IF;
END
$$;

-- ============================================
-- Nouvelles colonnes commande_items / fichiers
-- ============================================
ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS item_label TEXT;

ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fichiers_commande_item ON fichiers(commande_item_id);

-- ============================================
-- Historique de workflow / timeline
-- ============================================
CREATE TABLE IF NOT EXISTS commande_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL,
  type workflow_event_type NOT NULL DEFAULT 'note',
  titre TEXT NOT NULL,
  description TEXT,
  ancien_statut TEXT,
  nouveau_statut TEXT,
  visible_praticien BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_commande ON commande_workflow_events(commande_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_item ON commande_workflow_events(commande_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_events_visible ON commande_workflow_events(visible_praticien);

-- ============================================
-- Notes techniques / internes / partagées
-- ============================================
CREATE TABLE IF NOT EXISTS commande_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL,
  auteur_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  contenu TEXT NOT NULL,
  visible_praticien BOOLEAN NOT NULL DEFAULT false,
  type_note TEXT NOT NULL DEFAULT 'interne',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commande_notes_commande ON commande_notes(commande_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commande_notes_visible ON commande_notes(visible_praticien);

-- ============================================
-- Checklist QC
-- ============================================
CREATE TABLE IF NOT EXISTS commande_qc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  libelle TEXT NOT NULL,
  resultat qc_check_result NOT NULL DEFAULT 'conforme',
  commentaire TEXT,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_checks_commande ON commande_qc_checks(commande_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_checks_item ON commande_qc_checks(commande_item_id, created_at DESC);

-- ============================================
-- Trigger updated_at pour commande_items si colonnes futures
-- ============================================
-- Aucun trigger nécessaire ici: on conserve un schéma simple.

-- ============================================
-- RLS
-- ============================================
ALTER TABLE commande_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_qc_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_events_select_access" ON commande_workflow_events;
CREATE POLICY "workflow_events_select_access"
  ON commande_workflow_events FOR SELECT
  TO authenticated
  USING (
    visible_praticien = true
    AND (
      EXISTS (
        SELECT 1 FROM commandes
        WHERE commandes.id = commande_workflow_events.commande_id
        AND commandes.dentiste_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "workflow_events_admin_all" ON commande_workflow_events;
CREATE POLICY "workflow_events_admin_all"
  ON commande_workflow_events FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "commande_notes_select_access" ON commande_notes;
CREATE POLICY "commande_notes_select_access"
  ON commande_notes FOR SELECT
  TO authenticated
  USING (
    visible_praticien = true
    AND (
      EXISTS (
        SELECT 1 FROM commandes
        WHERE commandes.id = commande_notes.commande_id
        AND commandes.dentiste_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

DROP POLICY IF EXISTS "commande_notes_admin_all" ON commande_notes;
CREATE POLICY "commande_notes_admin_all"
  ON commande_notes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "qc_checks_select_access" ON commande_qc_checks;
CREATE POLICY "qc_checks_select_access"
  ON commande_qc_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes
      WHERE commandes.id = commande_qc_checks.commande_id
      AND commandes.dentiste_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "qc_checks_admin_all" ON commande_qc_checks;
CREATE POLICY "qc_checks_admin_all"
  ON commande_qc_checks FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE commande_workflow_events;
ALTER PUBLICATION supabase_realtime ADD TABLE commande_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE commande_qc_checks;
