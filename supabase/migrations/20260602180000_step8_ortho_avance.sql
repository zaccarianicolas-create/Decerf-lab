-- ============================================
-- DECERF LAB - Etape 8: ortho avance
-- Dossier technique ortho + suivi par etapes
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ortho_traitement_type') THEN
    CREATE TYPE ortho_traitement_type AS ENUM (
      'aligneurs',
      'contention',
      'appareil_amovible',
      'gouttiere',
      'autre'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ortho_etape_statut') THEN
    CREATE TYPE ortho_etape_statut AS ENUM (
      'prevu',
      'en_cours',
      'termine',
      'saute'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS commande_ortho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL UNIQUE REFERENCES commandes(id) ON DELETE CASCADE,
  commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL,
  type_traitement ortho_traitement_type NOT NULL DEFAULT 'aligneurs',
  plan_traitement TEXT,
  nb_aligneurs INTEGER NOT NULL DEFAULT 0 CHECK (nb_aligneurs >= 0 AND nb_aligneurs <= 200),
  etape_courante INTEGER NOT NULL DEFAULT 0 CHECK (etape_courante >= 0),
  date_debut DATE,
  date_fin_prevue DATE,
  date_fin_reelle DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commande_ortho_commande ON commande_ortho(commande_id);

CREATE TRIGGER tr_commande_ortho_updated_at
  BEFORE UPDATE ON commande_ortho
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS commande_ortho_etapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ortho_id UUID NOT NULL REFERENCES commande_ortho(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero >= 1),
  label TEXT,
  date_prevue DATE,
  date_realisee DATE,
  statut ortho_etape_statut NOT NULL DEFAULT 'prevu',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ortho_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_ortho_etapes_ortho ON commande_ortho_etapes(ortho_id);

CREATE TRIGGER tr_ortho_etapes_updated_at
  BEFORE UPDATE ON commande_ortho_etapes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE commande_ortho ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_ortho_etapes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ortho_select_access" ON commande_ortho;
CREATE POLICY "ortho_select_access"
  ON commande_ortho FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commandes c
      WHERE c.id = commande_ortho.commande_id
      AND (
        c.dentiste_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "ortho_admin_all" ON commande_ortho;
CREATE POLICY "ortho_admin_all"
  ON commande_ortho FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "ortho_etapes_select_access" ON commande_ortho_etapes;
CREATE POLICY "ortho_etapes_select_access"
  ON commande_ortho_etapes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM commande_ortho co
      JOIN commandes c ON c.id = co.commande_id
      WHERE co.id = commande_ortho_etapes.ortho_id
      AND (
        c.dentiste_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "ortho_etapes_admin_all" ON commande_ortho_etapes;
CREATE POLICY "ortho_etapes_admin_all"
  ON commande_ortho_etapes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE commande_ortho;
ALTER PUBLICATION supabase_realtime ADD TABLE commande_ortho_etapes;
