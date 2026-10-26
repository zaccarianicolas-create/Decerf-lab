BEGIN;

CREATE TABLE IF NOT EXISTS public.service_catalog_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('categorie', 'materiau', 'teinte')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_catalog_options_kind_value_unique UNIQUE (kind, value),
  CONSTRAINT service_catalog_options_label_not_empty CHECK (length(btrim(label)) > 0),
  CONSTRAINT service_catalog_options_value_not_empty CHECK (length(btrim(value)) > 0)
);

CREATE INDEX IF NOT EXISTS service_catalog_options_active_order_idx
  ON public.service_catalog_options(kind, actif, ordre, label);

ALTER TABLE public.service_catalog_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_catalog_options_read_active ON public.service_catalog_options;
CREATE POLICY service_catalog_options_read_active
  ON public.service_catalog_options FOR SELECT TO authenticated
  USING (
    actif = TRUE
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'dentiste')
    )
  );

DROP POLICY IF EXISTS service_catalog_options_admin_all ON public.service_catalog_options;
CREATE POLICY service_catalog_options_admin_all
  ON public.service_catalog_options FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

INSERT INTO public.service_catalog_options (kind, value, label, ordre) VALUES
  ('categorie', 'prothese_fixe', 'Prothèse fixe', 10),
  ('categorie', 'prothese_amovible', 'Prothèse amovible', 20),
  ('categorie', 'implantologie', 'Implantologie', 30),
  ('categorie', 'orthodontie', 'Orthodontie', 40),
  ('categorie', 'esthetique', 'Esthétique', 50),
  ('categorie', 'autre', 'Autre', 60),
  ('materiau', 'zircone', 'Zircone', 10),
  ('materiau', 'emax', 'E.max', 20),
  ('materiau', 'metal', 'Métal', 30),
  ('materiau', 'ceramique', 'Céramique', 40),
  ('materiau', 'resine', 'Résine', 50),
  ('materiau', 'composite', 'Composite', 60),
  ('materiau', 'titane', 'Titane', 70),
  ('materiau', 'chrome_cobalt', 'Chrome-Cobalt', 80),
  ('materiau', 'autre', 'Autre', 90),
  ('teinte', 'A1', 'A1', 10), ('teinte', 'A2', 'A2', 20),
  ('teinte', 'A3', 'A3', 30), ('teinte', 'A3.5', 'A3.5', 40), ('teinte', 'A4', 'A4', 50),
  ('teinte', 'B1', 'B1', 60), ('teinte', 'B2', 'B2', 70), ('teinte', 'B3', 'B3', 80), ('teinte', 'B4', 'B4', 90),
  ('teinte', 'C1', 'C1', 100), ('teinte', 'C2', 'C2', 110), ('teinte', 'C3', 'C3', 120), ('teinte', 'C4', 'C4', 130),
  ('teinte', 'D2', 'D2', 140), ('teinte', 'D3', 'D3', 150), ('teinte', 'D4', 'D4', 160),
  ('teinte', 'BL1', 'BL1', 170), ('teinte', 'BL2', 'BL2', 180), ('teinte', 'BL3', 'BL3', 190), ('teinte', 'BL4', 'BL4', 200),
  ('teinte', 'personnalisee', 'Personnalisée', 210)
ON CONFLICT (kind, value) DO NOTHING;

ALTER TABLE public.services_labo
  ALTER COLUMN categorie DROP DEFAULT,
  ALTER COLUMN materiaux_disponibles DROP DEFAULT;

ALTER TABLE public.services_labo
  ALTER COLUMN categorie TYPE TEXT USING categorie::TEXT,
  ALTER COLUMN materiaux_disponibles TYPE TEXT[] USING materiaux_disponibles::TEXT[];

ALTER TABLE public.services_labo
  ALTER COLUMN categorie SET DEFAULT 'prothese_fixe',
  ALTER COLUMN materiaux_disponibles SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.commande_items
  ALTER COLUMN materiau TYPE TEXT USING materiau::TEXT;

COMMIT;
