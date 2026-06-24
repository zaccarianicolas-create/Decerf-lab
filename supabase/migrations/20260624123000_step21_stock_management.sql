-- ============================================================
-- STEP 21 — Gestion de stock labo
-- Articles, mouvements, seuils d'alerte, traçabilité
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'type_mouvement_stock'
  ) THEN
    CREATE TYPE type_mouvement_stock AS ENUM (
      'entree',
      'sortie',
      'consommation',
      'casse',
      'ajustement_positif',
      'ajustement_negatif'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS stock_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre',
  unite TEXT NOT NULL DEFAULT 'piece',
  quantite_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  seuil_alerte NUMERIC(12,2) NOT NULL DEFAULT 0,
  emplacement TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_mouvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES stock_articles(id) ON DELETE CASCADE,
  type_mouvement type_mouvement_stock NOT NULL,
  quantite NUMERIC(12,2) NOT NULL CHECK (quantite > 0),
  quantite_avant NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantite_apres NUMERIC(12,2) NOT NULL DEFAULT 0,
  motif TEXT,
  commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,
  fiche_manuelle_id UUID REFERENCES fiches_manuelles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_articles_categorie ON stock_articles(categorie);
CREATE INDEX IF NOT EXISTS idx_stock_articles_actif ON stock_articles(actif);
CREATE INDEX IF NOT EXISTS idx_stock_articles_alert ON stock_articles(seuil_alerte);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_article ON stock_mouvements(article_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_commande ON stock_mouvements(commande_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_fiche ON stock_mouvements(fiche_manuelle_id);
CREATE INDEX IF NOT EXISTS idx_stock_mouvements_created_at ON stock_mouvements(created_at DESC);

ALTER TABLE stock_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mouvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_stock_articles_all" ON stock_articles;
CREATE POLICY "admin_stock_articles_all"
  ON stock_articles FOR ALL
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

DROP POLICY IF EXISTS "admin_stock_mouvements_all" ON stock_mouvements;
CREATE POLICY "admin_stock_mouvements_all"
  ON stock_mouvements FOR ALL
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

CREATE OR REPLACE FUNCTION update_stock_article_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_articles_updated_at ON stock_articles;
CREATE TRIGGER stock_articles_updated_at
  BEFORE UPDATE ON stock_articles
  FOR EACH ROW EXECUTE FUNCTION update_stock_article_timestamp();

CREATE OR REPLACE FUNCTION apply_stock_mouvement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  current_qty NUMERIC(12,2);
  next_qty NUMERIC(12,2);
  delta NUMERIC(12,2);
BEGIN
  SELECT quantite_stock
  INTO current_qty
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

  NEW.quantite_avant := current_qty;
  NEW.quantite_apres := next_qty;

  UPDATE stock_articles
  SET quantite_stock = next_qty,
      updated_at = NOW()
  WHERE id = NEW.article_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stock_mouvements_apply ON stock_mouvements;
CREATE TRIGGER stock_mouvements_apply
  BEFORE INSERT ON stock_mouvements
  FOR EACH ROW EXECUTE FUNCTION apply_stock_mouvement();
