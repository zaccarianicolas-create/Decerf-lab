BEGIN;

ALTER TABLE public.certificats_conformite
  ADD COLUMN IF NOT EXISTS classe_dispositif TEXT,
  ADD COLUMN IF NOT EXISTS code_nomenclature TEXT,
  ADD COLUMN IF NOT EXISTS notice_utilisation_storage_path TEXT;

ALTER TABLE public.certificats_conformite
  DROP CONSTRAINT IF EXISTS certificats_conformite_classe_dispositif_check;

ALTER TABLE public.certificats_conformite
  ADD CONSTRAINT certificats_conformite_classe_dispositif_check
  CHECK (
    classe_dispositif IS NULL
    OR classe_dispositif IN ('I', 'IIa', 'IIb', 'III')
  );

COMMIT;