-- ============================================================
-- STEP 22 — Lots de stock + lien protocole
-- ============================================================

ALTER TABLE stock_articles
  ADD COLUMN IF NOT EXISTS gestion_lots BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS stock_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES stock_articles(id) ON DELETE CASCADE,
  numero_lot TEXT NOT NULL,
  fournisseur TEXT,
  date_reception DATE,
  date_peremption DATE,
  quantite_initiale NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantite_restante NUMERIC(12,2) NOT NULL DEFAULT 0,
  cout_unitaire NUMERIC(12,4),
  actif BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, numero_lot)
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_article ON stock_lots(article_id);
CREATE INDEX IF NOT EXISTS idx_stock_lots_peremption ON stock_lots(date_peremption);

ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_stock_lots_all" ON stock_lots;
CREATE POLICY "admin_stock_lots_all"
  ON stock_lots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

ALTER TABLE stock_mouvements
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES stock_lots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS protocole_instance_id UUID REFERENCES protocole_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_lot ON stock_mouvements(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_protocole ON stock_mouvements(protocole_instance_id);

CREATE OR REPLACE FUNCTION update_stock_lot_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_lots_updated_at ON stock_lots;
CREATE TRIGGER stock_lots_updated_at
  BEFORE UPDATE ON stock_lots
  FOR EACH ROW EXECUTE FUNCTION update_stock_lot_timestamp();

CREATE OR REPLACE FUNCTION apply_stock_mouvement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_qty NUMERIC(12,2);
  next_qty NUMERIC(12,2);
  delta NUMERIC(12,2);
  lot_current_qty NUMERIC(12,2);
  lot_next_qty NUMERIC(12,2);
  article_uses_lots BOOLEAN;
BEGIN
  SELECT quantite_stock, gestion_lots
  INTO current_qty, article_uses_lots
  FROM stock_articles
  WHERE id = NEW.article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article de stock introuvable';
  END IF;

  delta := CASE NEW.type_mouvement
    WHEN 'entree' THEN NEW.quantite
    WHEN 'ajustement_positif' THEN NEW.quantite
    WHEN 'sortie' THEN -NEW.quantite
    WHEN 'consommation' THEN -NEW.quantite
    WHEN 'casse' THEN -NEW.quantite
    WHEN 'ajustement_negatif' THEN -NEW.quantite
  END;

  next_qty := current_qty + delta;
  IF next_qty < 0 THEN
    RAISE EXCEPTION 'Stock insuffisant pour ce mouvement';
  END IF;

  IF article_uses_lots
    AND NEW.type_mouvement IN ('sortie', 'consommation', 'casse', 'ajustement_negatif')
    AND NEW.lot_id IS NULL THEN
    RAISE EXCEPTION 'Un lot est requis pour cet article';
  END IF;

  IF NEW.lot_id IS NOT NULL THEN
    SELECT quantite_restante
    INTO lot_current_qty
    FROM stock_lots
    WHERE id = NEW.lot_id
      AND article_id = NEW.article_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Lot introuvable pour cet article';
    END IF;

    lot_next_qty := lot_current_qty + delta;

    IF lot_next_qty < 0 THEN
      RAISE EXCEPTION 'Quantité lot insuffisante';
    END IF;

    UPDATE stock_lots
    SET quantite_restante = lot_next_qty,
        actif = lot_next_qty > 0,
        updated_at = NOW()
    WHERE id = NEW.lot_id;
  END IF;

  NEW.quantite_avant := current_qty;
  NEW.quantite_apres := next_qty;

  UPDATE stock_articles
  SET quantite_stock = next_qty,
      updated_at = NOW()
  WHERE id = NEW.article_id;

  RETURN NEW;
END;
$$;
