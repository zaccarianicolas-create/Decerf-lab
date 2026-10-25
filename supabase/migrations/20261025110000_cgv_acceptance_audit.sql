BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cgv_version_acceptation TEXT,
  ADD COLUMN IF NOT EXISTS cgv_acceptees_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.record_cgv_acceptance_from_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_metadata JSONB;
  accepted_version TEXT;
BEGIN
  SELECT users.raw_user_meta_data
    INTO user_metadata
  FROM auth.users AS users
  WHERE users.id = NEW.id;

  accepted_version := NULLIF(btrim(user_metadata->>'cgv_version_acceptation'), '');
  IF user_metadata->>'cgv_accepted' = 'true' AND accepted_version IS NOT NULL THEN
    UPDATE public.profiles
    SET cgv_version_acceptation = accepted_version,
        cgv_acceptees_at = now()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_record_cgv_acceptance ON public.profiles;
CREATE TRIGGER profiles_record_cgv_acceptance
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.record_cgv_acceptance_from_auth_metadata();

COMMIT;