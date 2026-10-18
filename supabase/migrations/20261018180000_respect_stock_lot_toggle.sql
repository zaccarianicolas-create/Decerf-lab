BEGIN;

CREATE OR REPLACE FUNCTION public.apply_stock_mouvement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_qty NUMERIC(12,2);
  next_qty NUMERIC(12,2);
  delta NUMERIC(12,2);
  lot_current_qty NUMERIC(12,2);
  lot_next_qty NUMERIC(12,2);
  article_uses_lots BOOLEAN;
  lot_tracking_enabled BOOLEAN;
BEGIN
  SELECT quantite_stock, gestion_lots
  INTO current_qty, article_uses_lots
  FROM public.stock_articles
  WHERE id = NEW.article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article de stock introuvable';
  END IF;

  SELECT COALESCE(
    (SELECT gestion_lots_stock_active FROM public.parametres_labo LIMIT 1),
    true
  ) INTO lot_tracking_enabled;

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

  IF lot_tracking_enabled AND article_uses_lots AND NEW.lot_id IS NULL THEN
    RAISE EXCEPTION 'Un lot est requis pour chaque mouvement de cet article';
  END IF;

  IF NEW.lot_id IS NOT NULL THEN
    SELECT quantite_restante
    INTO lot_current_qty
    FROM public.stock_lots
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

    UPDATE public.stock_lots
    SET quantite_restante = lot_next_qty,
        actif = lot_next_qty > 0,
        updated_at = NOW()
    WHERE id = NEW.lot_id;
  END IF;

  NEW.quantite_avant := current_qty;
  NEW.quantite_apres := next_qty;

  UPDATE public.stock_articles
  SET quantite_stock = next_qty,
      updated_at = NOW()
  WHERE id = NEW.article_id;

  RETURN NEW;
END;
$$;

COMMIT;
