-- ============================================================
-- STEP 23 — Toggle Paramètres pour la traçabilité lots stock
-- ============================================================

ALTER TABLE parametres_labo
  ADD COLUMN IF NOT EXISTS gestion_lots_stock_active BOOLEAN NOT NULL DEFAULT true;

UPDATE parametres_labo
SET gestion_lots_stock_active = true
WHERE gestion_lots_stock_active IS NULL;
