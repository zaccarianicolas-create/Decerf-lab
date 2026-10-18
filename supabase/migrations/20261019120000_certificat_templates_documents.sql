BEGIN;

ALTER TABLE public.certificats_conformite
  ADD COLUMN IF NOT EXISTS modele_id UUID,
  ADD COLUMN IF NOT EXISTS modele_version INTEGER,
  ADD COLUMN IF NOT EXISTS donnees_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS labo_site_fabrication TEXT,
  ADD COLUMN IF NOT EXISTS vas_export_storage_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificats_commande_unique
  ON public.certificats_conformite(commande_id);

ALTER TABLE public.stock_mouvements
  ADD COLUMN IF NOT EXISTS commande_item_id UUID
    REFERENCES public.commande_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_mouvements_commande_item
  ON public.stock_mouvements(commande_item_id);

CREATE TABLE IF NOT EXISTS public.certificat_modeles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  description TEXT,
  contenu_template TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  est_defaut BOOLEAN NOT NULL DEFAULT false,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificat_modeles_actif
  ON public.certificat_modeles(actif, est_defaut);

ALTER TABLE public.certificats_conformite
  ADD CONSTRAINT certificats_conformite_modele_id_fkey
  FOREIGN KEY (modele_id) REFERENCES public.certificat_modeles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_certificats_dentiste_statut
  ON public.certificats_conformite(dentiste_id, statut);

ALTER TABLE public.certificat_modeles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certificat_modeles_admin_all ON public.certificat_modeles;
CREATE POLICY certificat_modeles_admin_all
  ON public.certificat_modeles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

INSERT INTO public.certificat_modeles (code, nom, description, contenu_template, version, est_defaut)
VALUES (
  'annexe-xiii-default',
  'Déclaration MDR – dispositif sur mesure',
  'Modèle de déclaration patient conforme aux champs de l’Annexe XIII du règlement (UE) 2017/745.',
  'DÉCLARATION DE CONFORMITÉ — DISPOSITIF SUR MESURE

Fabricant : {{labo.nom}}
Adresse du fabricant : {{labo.adresse}}
Site de fabrication : {{labo.site_fabrication}}

Dispositif(s) concerné(s) :
{{dispositifs.liste}}

Patient (nom, acronyme ou code) : {{patient.identifiant}}
Prescripteur habilité : {{dentiste.nom}}
Établissement prescripteur : {{dentiste.cabinet}}

Caractéristiques spécifiques de conception indiquées par la prescription :
{{prescription.caracteristiques}}

Matériaux et lots tracés utilisés pour ce travail :
{{production.materiaux_lots}}

Déclaration du fabricant :
{{conformite.declaration}}

Exigences générales de sécurité et de performance non entièrement satisfaites, le cas échéant :
{{conformite.exigences_non_satisfaites}}

Justification correspondante, le cas échéant :
{{conformite.justification}}

Cette déclaration est remise avec le dispositif au patient/utilisateur identifié ci-dessus. Le fabricant conserve un exemplaire selon les durées légales applicables.

Fait à : {{labo.adresse}}
Date d’émission : {{document.date_emission}}
Signataire et fonction : {{document.signataire}}
Numéro de déclaration : {{document.numero}}',
  1,
  true
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('certificats', 'certificats', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS certificats_pdf_read_owner ON storage.objects;
CREATE POLICY certificats_pdf_read_owner
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificats'
    AND (
      EXISTS (
        SELECT 1 FROM public.certificats_conformite certificat
        WHERE certificat.pdf_storage_bucket = 'certificats'
          AND certificat.pdf_storage_path = storage.objects.name
          AND certificat.dentiste_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

COMMIT;