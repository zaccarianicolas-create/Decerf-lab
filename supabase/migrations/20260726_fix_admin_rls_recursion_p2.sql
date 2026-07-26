-- Fix: Désactiver RLS complètement sur les tables avec admin checks (une solution temporaire)
-- Trop de policies référencent "EXISTS FROM profiles WHERE role='admin'" → boucle infinie
-- Solution : Désactiver RLS, gérer les droits au niveau application

-- Les tables suivantes auront RLS désactif car trop complexe avec les checks admin:
-- IMPORTANT: le backend API middleware gère les autorisations avec service_role

-- Cabinets
ALTER TABLE cabinets DISABLE ROW LEVEL SECURITY;

-- Réactiver avec policies simples
ALTER TABLE cabinets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gère les cabinets" ON cabinets;
DROP POLICY IF EXISTS "Cabinets visibles par authentifiés" ON cabinets;
DROP POLICY IF EXISTS "Dentiste modifie son cabinet" ON cabinets;

CREATE POLICY "cabinets_select"
  ON cabinets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "cabinets_update_own"
  ON cabinets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND cabinet_id = cabinets.id)
  );

-- Les autres tables (patients, commandes, etc) : admin checks gérés au niveau API
-- Les policies spécifiques à chaque table restent, mais sans check "admin"
