BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cgu_version_acceptation TEXT,
  ADD COLUMN IF NOT EXISTS cgu_acceptees_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.record_cgv_acceptance_from_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_metadata JSONB;
  cgv_version TEXT;
  cgu_version TEXT;
  acceptance_time TIMESTAMPTZ := now();
BEGIN
  SELECT users.raw_user_meta_data
    INTO user_metadata
  FROM auth.users AS users
  WHERE users.id = NEW.id;

  cgv_version := NULLIF(btrim(user_metadata->>'cgv_version_acceptation'), '');
  cgu_version := NULLIF(btrim(user_metadata->>'cgu_version_acceptation'), '');

  UPDATE public.profiles
  SET cgv_version_acceptation = CASE
        WHEN user_metadata->>'cgv_accepted' = 'true' THEN cgv_version
        ELSE NULL
      END,
      cgv_acceptees_at = CASE
        WHEN user_metadata->>'cgv_accepted' = 'true' AND cgv_version IS NOT NULL THEN acceptance_time
        ELSE NULL
      END,
      cgu_version_acceptation = CASE
        WHEN user_metadata->>'cgu_accepted' = 'true' THEN cgu_version
        ELSE NULL
      END,
      cgu_acceptees_at = CASE
        WHEN user_metadata->>'cgu_accepted' = 'true' AND cgu_version IS NOT NULL THEN acceptance_time
        ELSE NULL
      END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

COMMIT;
