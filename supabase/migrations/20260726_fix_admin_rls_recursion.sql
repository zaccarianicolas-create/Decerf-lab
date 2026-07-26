-- Fix: Corriger la boucle infinie des policies RLS
-- Issue: Les policies qui referent "EXISTS (SELECT 1 FROM profiles WHERE role='admin')" créent une récursion infinie
-- Solution: Désactiver RLS sur profiles, gérer les droits au niveau application avec service role

-- Désactiver RLS sur profiles (les checks admin seront fait au niveau app backend)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies existantes  
DROP POLICY IF EXISTS "Admin peut tout modifier sur profiles" ON profiles;
DROP POLICY IF EXISTS "Modifier son propre profil" ON profiles;
DROP POLICY IF EXISTS "Profils visibles par les utilisateurs authentifiés" ON profiles;

-- Réactiver RLS avec des policies simples SANS auto-référence
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Authentifiés peuvent voir tous les profils (pour le chat, etc.)
CREATE POLICY "profiles_select"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Chacun peut modifier son propre profil
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admin checks handled at APPLICATION LEVEL via service_role key
-- No need for RLS policy here - prevents infinite recursion
