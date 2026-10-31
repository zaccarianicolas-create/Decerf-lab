ALTER TABLE public.paiements
  ALTER COLUMN commande_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'paiements_commande_ou_facture_check'
      AND conrelid = 'public.paiements'::regclass
  ) THEN
    ALTER TABLE public.paiements
      ADD CONSTRAINT paiements_commande_ou_facture_check
      CHECK (commande_id IS NOT NULL OR facture_id IS NOT NULL);
  END IF;
END
$$;