-- Fix: handle_new_user trigger plus robuste
-- Le COALESCE avec cast direct peut crasher si la valeur est NULL avant le cast
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'dentiste';
BEGIN
  -- Tenter le cast du rôle, fallback sur 'dentiste'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
