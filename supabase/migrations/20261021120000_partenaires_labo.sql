BEGIN;

CREATE TABLE IF NOT EXISTS public.partenaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  logo_path TEXT,
  site_url TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partenaires_actifs_ordre_idx
  ON public.partenaires(actif, ordre, nom);

ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partenaires_public_read ON public.partenaires;
CREATE POLICY partenaires_public_read
  ON public.partenaires FOR SELECT TO anon, authenticated
  USING (actif = true);

DROP POLICY IF EXISTS partenaires_admin_all ON public.partenaires;
CREATE POLICY partenaires_admin_all
  ON public.partenaires FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

INSERT INTO public.partenaires (slug, nom, site_url, ordre, actif)
VALUES ('lexeragroup', 'Lexeragroup', 'https://lexeragroup.com', 0, true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;