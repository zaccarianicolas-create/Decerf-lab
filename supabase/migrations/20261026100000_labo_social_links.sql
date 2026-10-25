ALTER TABLE public.parametres_labo
  ADD COLUMN IF NOT EXISTS reseau_facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS reseau_instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS reseau_x_url TEXT,
  ADD COLUMN IF NOT EXISTS reseau_linkedin_url TEXT;
