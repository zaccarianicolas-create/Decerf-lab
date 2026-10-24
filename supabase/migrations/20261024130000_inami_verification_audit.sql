BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_inami_verifie_le TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS numero_inami_verifie_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.reset_inami_verification_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_inami IS DISTINCT FROM OLD.numero_inami THEN
    NEW.numero_inami_verifie := false;
    NEW.numero_inami_verifie_le := NULL;
    NEW.numero_inami_verifie_par := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_reset_inami_verification ON public.profiles;
CREATE TRIGGER profiles_reset_inami_verification
  BEFORE UPDATE OF numero_inami ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reset_inami_verification_on_change();

COMMIT;