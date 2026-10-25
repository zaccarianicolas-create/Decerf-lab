ALTER TABLE public.parametres_labo
  ADD COLUMN IF NOT EXISTS titulaire_legal TEXT NOT NULL DEFAULT 'Julie Decerf',
  ADD COLUMN IF NOT EXISTS forme_juridique TEXT NOT NULL DEFAULT 'Personne physique';