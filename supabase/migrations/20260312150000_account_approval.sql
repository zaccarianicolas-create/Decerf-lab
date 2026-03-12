-- ============================================
-- DECERF LAB - Système de validation des inscriptions
-- Le superadmin doit approuver chaque inscription
-- + Email de confirmation Supabase
-- ============================================

-- 1. Type enum pour le statut de compte
CREATE TYPE statut_compte AS ENUM ('en_attente', 'approuve', 'rejete');

-- 2. Ajouter la colonne statut_compte sur profiles
ALTER TABLE profiles
  ADD COLUMN statut_compte statut_compte NOT NULL DEFAULT 'en_attente';

-- 3. Marquer les comptes admin existants comme approuvés
UPDATE profiles SET statut_compte = 'approuve' WHERE role = 'admin';

-- 4. Passer zaccaria.nicolas@gmail.com en superadmin (admin + approuvé)
UPDATE profiles
SET role = 'admin', statut_compte = 'approuve'
WHERE email = 'zaccaria.nicolas@gmail.com';

-- 5. Recréer la fonction handle_new_user pour inclure statut_compte
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'dentiste';
  _statut statut_compte := 'en_attente';
BEGIN
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      _role := 'dentiste';
    END;
  END IF;

  -- Les admins sont automatiquement approuvés
  IF _role = 'admin' THEN
    _statut := 'approuve';
  END IF;

  INSERT INTO public.profiles (id, email, nom, prenom, role, statut_compte)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    _role,
    _statut
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Index pour rechercher rapidement les comptes en attente
CREATE INDEX idx_profiles_statut_compte ON profiles(statut_compte);
