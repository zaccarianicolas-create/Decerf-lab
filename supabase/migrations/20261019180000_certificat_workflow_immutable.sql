BEGIN;

CREATE OR REPLACE FUNCTION public.guard_certificat_conformite_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  snapshot JSONB;
  unmet_requirements TEXT;
  justification TEXT;
BEGIN
  IF OLD.statut = 'brouillon' AND NEW.statut NOT IN ('brouillon', 'valide') THEN
    RAISE EXCEPTION 'Une fiche brouillon doit être validée avant émission';
  ELSIF OLD.statut = 'valide' AND NEW.statut NOT IN ('valide', 'emis') THEN
    RAISE EXCEPTION 'Une fiche validée ne peut être que conservée ou émise';
  ELSIF OLD.statut = 'emis' AND NEW.statut NOT IN ('emis', 'envoye') THEN
    RAISE EXCEPTION 'Une fiche émise ne peut être que conservée ou mise à disposition';
  ELSIF OLD.statut = 'envoye' AND NEW.statut <> 'envoye' THEN
    RAISE EXCEPTION 'Une fiche mise à disposition ne peut pas revenir à un état antérieur';
  END IF;

  IF OLD.statut <> 'brouillon' AND ROW(
    NEW.labo_nom,
    NEW.labo_adresse,
    NEW.labo_responsable,
    NEW.labo_numero_agrement,
    NEW.labo_site_fabrication,
    NEW.dentiste_id,
    NEW.dentiste_nom,
    NEW.dentiste_inami,
    NEW.patient_id,
    NEW.patient_reference,
    NEW.description_travail,
    NEW.materiaux_utilises,
    NEW.dents,
    NEW.lot_materiaux,
    NEW.normes_appliquees,
    NEW.declaration_conformite,
    NEW.contenu_complet,
    NEW.date_emission,
    NEW.signe_par,
    NEW.modele_id,
    NEW.modele_version,
    NEW.donnees_snapshot,
    NEW.version,
    NEW.classe_dispositif,
    NEW.code_nomenclature,
    NEW.notice_utilisation_storage_path
  ) IS DISTINCT FROM ROW(
    OLD.labo_nom,
    OLD.labo_adresse,
    OLD.labo_responsable,
    OLD.labo_numero_agrement,
    OLD.labo_site_fabrication,
    OLD.dentiste_id,
    OLD.dentiste_nom,
    OLD.dentiste_inami,
    OLD.patient_id,
    OLD.patient_reference,
    OLD.description_travail,
    OLD.materiaux_utilises,
    OLD.dents,
    OLD.lot_materiaux,
    OLD.normes_appliquees,
    OLD.declaration_conformite,
    OLD.contenu_complet,
    OLD.date_emission,
    OLD.signe_par,
    OLD.modele_id,
    OLD.modele_version,
    OLD.donnees_snapshot,
    OLD.version,
    OLD.classe_dispositif,
    OLD.code_nomenclature,
    OLD.notice_utilisation_storage_path
  ) THEN
    RAISE EXCEPTION 'Le contenu d’une fiche validée est immuable';
  END IF;

  IF OLD.statut = 'brouillon' AND NEW.statut = 'valide' THEN
    snapshot := COALESCE(NEW.donnees_snapshot, '{}'::jsonb);
    unmet_requirements := btrim(COALESCE(snapshot->>'exigences_non_satisfaites', ''));
    justification := btrim(COALESCE(snapshot->>'justification', ''));
    IF NULLIF(btrim(NEW.labo_nom), '') IS NULL
      OR NULLIF(btrim(NEW.labo_adresse), '') IS NULL
      OR NULLIF(btrim(NEW.labo_site_fabrication), '') IS NULL
      OR NULLIF(btrim(NEW.dentiste_nom), '') IS NULL
      OR NULLIF(btrim(snapshot #>> '{dentiste,adresse}'), '') IS NULL
      OR NULLIF(btrim(NEW.patient_reference), '') IS NULL
      OR NULLIF(btrim(NEW.description_travail), '') IS NULL
      OR NULLIF(btrim(NEW.declaration_conformite), '') IS NULL
      OR NULLIF(btrim(NEW.signe_par), '') IS NULL
      OR NEW.classe_dispositif IS NULL
      OR unmet_requirements = ''
    THEN
      RAISE EXCEPTION 'Les informations obligatoires de la déclaration sont incomplètes';
    END IF;
    IF unmet_requirements !~* '^(aucun(e)?|néant|non applicable)$' AND justification = '' THEN
      RAISE EXCEPTION 'La justification des exigences non satisfaites est obligatoire';
    END IF;
  END IF;

  IF OLD.statut = 'valide' AND NEW.statut = 'emis'
    AND (NEW.pdf_storage_bucket IS DISTINCT FROM 'certificats' OR NULLIF(NEW.pdf_storage_path, '') IS NULL)
  THEN
    RAISE EXCEPTION 'Un PDF archivé est requis pour émettre une fiche';
  END IF;

  IF OLD.statut = 'emis' AND NEW.statut = 'envoye'
    AND (OLD.pdf_storage_bucket IS DISTINCT FROM 'certificats' OR NULLIF(OLD.pdf_storage_path, '') IS NULL)
  THEN
    RAISE EXCEPTION 'Un PDF archivé est requis avant mise à disposition';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_certificats_conformite_workflow_guard ON public.certificats_conformite;
CREATE TRIGGER tr_certificats_conformite_workflow_guard
  BEFORE UPDATE ON public.certificats_conformite
  FOR EACH ROW EXECUTE FUNCTION public.guard_certificat_conformite_workflow();

COMMIT;