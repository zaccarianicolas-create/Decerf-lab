ALTER TABLE public.commande_items
  ADD COLUMN IF NOT EXISTS options_selectionnees UUID[] NOT NULL DEFAULT '{}'::UUID[];
