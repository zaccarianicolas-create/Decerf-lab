BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS numero_inami_verifie BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invitations_inscription
  ADD COLUMN IF NOT EXISTS numero_inami TEXT;

CREATE OR REPLACE FUNCTION public.copy_inami_from_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inami_value TEXT;
BEGIN
  SELECT NULLIF(btrim(users.raw_user_meta_data->>'numero_inami'), '')
    INTO inami_value
  FROM auth.users AS users
  WHERE users.id = NEW.id;

  IF inami_value IS NOT NULL THEN
    UPDATE public.profiles
    SET numero_inami = inami_value,
        numero_inami_verifie = false
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_copy_inami_from_auth_metadata ON public.profiles;
CREATE TRIGGER profiles_copy_inami_from_auth_metadata
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.copy_inami_from_auth_metadata();

CREATE OR REPLACE FUNCTION public.is_current_user_approved_dentist()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND profile.role = 'dentiste'
      AND profile.statut_compte = 'approuve'
      AND profile.actif = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_approved_dentist() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_approved_dentist() TO authenticated;

DROP POLICY IF EXISTS "Dentiste crée ses commandes" ON public.commandes;
CREATE POLICY "Dentiste crée ses commandes"
  ON public.commandes FOR INSERT TO authenticated
  WITH CHECK (
    dentiste_id = (SELECT auth.uid())
    AND public.is_current_user_approved_dentist()
  );

DROP POLICY IF EXISTS "Dentiste crée ses patients" ON public.patients;
CREATE POLICY "Dentiste crée ses patients"
  ON public.patients FOR INSERT TO authenticated
  WITH CHECK (
    dentiste_id = (SELECT auth.uid())
    AND public.is_current_user_approved_dentist()
  );

COMMIT;