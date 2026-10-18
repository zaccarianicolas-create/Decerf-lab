BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificats_commande_unique
  ON public.certificats_conformite(commande_id);

COMMIT;