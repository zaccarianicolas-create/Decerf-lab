-- ============================================
-- DECERF LAB - Etape 5: certificats industrialises
-- Workflow: brouillon -> valide -> emis -> envoye
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certificat_statut') THEN
    CREATE TYPE certificat_statut AS ENUM ('brouillon', 'valide', 'emis', 'envoye');
  END IF;
END
$$;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS statut certificat_statut NOT NULL DEFAULT 'brouillon';

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS date_validation TIMESTAMPTZ;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS emis_par UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS envoye_par UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS pdf_storage_bucket TEXT;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT;

ALTER TABLE certificats_conformite
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_certificats_statut ON certificats_conformite(statut);
CREATE INDEX IF NOT EXISTS idx_certificats_validation ON certificats_conformite(date_validation);

-- Backfill léger: conserver envoye si déjà envoyé, sinon brouillon
UPDATE certificats_conformite
SET statut = CASE
  WHEN envoye_au_praticien = true THEN 'envoye'::certificat_statut
  ELSE 'brouillon'::certificat_statut
END
WHERE statut IS NULL OR statut::text NOT IN ('brouillon', 'valide', 'emis', 'envoye');
