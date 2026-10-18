BEGIN;

DROP INDEX IF EXISTS public.idx_certificats_commande_unique;

ALTER TABLE public.certificats_conformite
  ADD COLUMN IF NOT EXISTS commande_item_id UUID
    REFERENCES public.commande_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_certificats_commande_item
  ON public.certificats_conformite(commande_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificats_commande_item_unique
  ON public.certificats_conformite(commande_item_id)
  WHERE commande_item_id IS NOT NULL;

COMMIT;