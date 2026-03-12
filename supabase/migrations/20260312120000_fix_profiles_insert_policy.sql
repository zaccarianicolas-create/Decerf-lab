-- Fix: Le trigger handle_new_user n'arrivait pas à INSERT dans profiles
-- car RLS est activé et il n'y a pas de policy INSERT.
-- SECURITY DEFINER devrait bypasser RLS, mais pour être sûr,
-- on recrée la fonction avec le bon owner et on ajoute une policy.

-- 1. S'assurer que la fonction est bien SECURITY DEFINER et owned par postgres
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'dentiste';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      _role := 'dentiste';
    END;
  END IF;

  INSERT INTO public.profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    _role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ajouter policy INSERT pour permettre la création de profil lors de l'inscription
-- Le service_role (utilisé par les triggers) doit pouvoir insérer
CREATE POLICY "Service role peut insérer des profils"
  ON profiles FOR INSERT
  WITH CHECK (true);
