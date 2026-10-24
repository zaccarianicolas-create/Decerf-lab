BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_entreprise TEXT,
  ADD COLUMN IF NOT EXISTS assujetti_tva BOOLEAN,
  ADD COLUMN IF NOT EXISTS numero_tva TEXT;

ALTER TABLE public.invitations_inscription
  ADD COLUMN IF NOT EXISTS numero_entreprise TEXT,
  ADD COLUMN IF NOT EXISTS assujetti_tva BOOLEAN,
  ADD COLUMN IF NOT EXISTS numero_tva TEXT;

CREATE OR REPLACE FUNCTION public.copy_inami_from_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_metadata JSONB;
BEGIN
  SELECT users.raw_user_meta_data
    INTO user_metadata
  FROM auth.users AS users
  WHERE users.id = NEW.id;

  UPDATE public.profiles
  SET numero_inami = NULLIF(btrim(user_metadata->>'numero_inami'), ''),
      numero_inami_verifie = false,
      numero_entreprise = NULLIF(btrim(user_metadata->>'numero_entreprise'), ''),
      assujetti_tva = CASE user_metadata->>'assujetti_tva'
        WHEN 'true' THEN true
        WHEN 'false' THEN false
        ELSE NULL
      END,
      numero_tva = NULLIF(btrim(user_metadata->>'numero_tva'), '')
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

COMMIT;