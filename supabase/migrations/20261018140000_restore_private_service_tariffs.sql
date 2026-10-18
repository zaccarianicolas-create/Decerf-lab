BEGIN;

CREATE OR REPLACE FUNCTION public.sync_service_legacy_tarif()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 OR NEW.prix_indicatif IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.service_tarifs (service_id, prix_base_ht)
  VALUES (NEW.id, NEW.prix_indicatif)
  ON CONFLICT (service_id) DO UPDATE
  SET prix_base_ht = EXCLUDED.prix_base_ht, updated_at = now()
  WHERE service_tarifs.prix_base_ht IS DISTINCT FROM EXCLUDED.prix_base_ht;

  UPDATE public.services_labo
  SET prix_indicatif = NULL
  WHERE id = NEW.id AND prix_indicatif IS NOT NULL;
  RETURN NEW;
END;
$$;

INSERT INTO public.service_tarifs (service_id, prix_base_ht)
SELECT service.id, seed.prix_base_ht
FROM public.services_labo AS service
JOIN (VALUES
  ('Couronne unitaire', 250.00),
  ('Bridge', 450.00),
  ('Inlay / Onlay', 200.00),
  ('Facette', 300.00),
  ('Prothèse amovible partielle', 350.00),
  ('Prothèse complète', 500.00),
  ('Couronne sur implant', 400.00),
  ('Appareil orthodontique', 200.00),
  ('Gouttière', 150.00)
) AS seed(nom, prix_base_ht) ON seed.nom = service.nom
ON CONFLICT (service_id) DO NOTHING;

UPDATE public.services_labo
SET prix_indicatif = NULL
WHERE prix_indicatif IS NOT NULL;

COMMIT;