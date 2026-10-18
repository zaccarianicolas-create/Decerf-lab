BEGIN;

CREATE TABLE IF NOT EXISTS public.service_tarifs (
  service_id UUID PRIMARY KEY REFERENCES public.services_labo(id) ON DELETE CASCADE,
  prix_base_ht NUMERIC(10,2) NOT NULL CHECK (prix_base_ht >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.service_tarifs (service_id, prix_base_ht)
SELECT id, prix_indicatif
FROM public.services_labo
WHERE prix_indicatif IS NOT NULL
ON CONFLICT (service_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_service_legacy_tarif()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NEW.prix_indicatif IS NULL THEN
    RETURN NEW;
  ELSE
    INSERT INTO public.service_tarifs (service_id, prix_base_ht)
    VALUES (NEW.id, NEW.prix_indicatif)
    ON CONFLICT (service_id) DO UPDATE
    SET prix_base_ht = EXCLUDED.prix_base_ht, updated_at = now()
    WHERE service_tarifs.prix_base_ht IS DISTINCT FROM EXCLUDED.prix_base_ht;
    UPDATE public.services_labo
    SET prix_indicatif = NULL
    WHERE id = NEW.id AND prix_indicatif IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_tarif_legacy_service()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_service_id UUID;
  v_prix NUMERIC(10,2);
BEGIN
  v_service_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.service_id ELSE NEW.service_id END;
  v_prix := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.prix_base_ht END;
  UPDATE public.services_labo
  SET prix_indicatif = v_prix
  WHERE id = v_service_id
    AND prix_indicatif IS DISTINCT FROM v_prix;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS tr_sync_service_legacy_tarif ON public.services_labo;
CREATE TRIGGER tr_sync_service_legacy_tarif
  AFTER INSERT OR UPDATE OF prix_indicatif ON public.services_labo
  FOR EACH ROW EXECUTE FUNCTION public.sync_service_legacy_tarif();

DROP TRIGGER IF EXISTS tr_sync_tarif_legacy_service ON public.service_tarifs;
CREATE TRIGGER tr_sync_tarif_legacy_service
  AFTER INSERT OR UPDATE OR DELETE ON public.service_tarifs
  FOR EACH ROW EXECUTE FUNCTION public.sync_tarif_legacy_service();

CREATE TABLE IF NOT EXISTS public.service_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services_labo(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  description TEXT,
  prix_ht NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (prix_ht >= 0),
  actif BOOLEAN NOT NULL DEFAULT true,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_options_service
  ON public.service_options(service_id, ordre);

ALTER TABLE public.service_tarifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_tarifs_admin_all ON public.service_tarifs;
CREATE POLICY service_tarifs_admin_all
  ON public.service_tarifs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS service_options_admin_all ON public.service_options;
CREATE POLICY service_options_admin_all
  ON public.service_options FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

ALTER TABLE public.facture_lignes
  ADD COLUMN IF NOT EXISTS service_labo_id UUID
    REFERENCES public.services_labo(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_option_id UUID
    REFERENCES public.service_options(id) ON DELETE SET NULL;

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS billing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_envoye_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS methode_paiement TEXT
    CHECK (methode_paiement IS NULL OR methode_paiement IN ('stripe', 'virement'));

ALTER TABLE public.cabinets
  ADD COLUMN IF NOT EXISTS tva_numero TEXT;

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS reference_externe TEXT,
  ADD COLUMN IF NOT EXISTS enregistre_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_commande_unique
  ON public.factures(commande_id)
  WHERE commande_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_numero_facture()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  annee TEXT := to_char(now(), 'YYYY');
  prochain_num INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.statut = 'brouillon' THEN
    IF NEW.numero IS NULL OR NEW.numero = '' THEN
      NEW.numero := 'BROUILLON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.statut = 'brouillon' OR OLD.statut <> 'brouillon' THEN
      RETURN NEW;
    END IF;
    IF NEW.numero IS NOT NULL AND NEW.numero <> '' AND NEW.numero NOT LIKE 'BROUILLON-%' THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('facture-' || annee)::bigint);

  SELECT COALESCE(MAX((regexp_match(numero, '^FAC-' || annee || '-([0-9]+)$'))[1]::INTEGER), 0) + 1
    INTO prochain_num
    FROM public.factures
    WHERE numero ~ ('^FAC-' || annee || '-[0-9]+$');

  NEW.numero := 'FAC-' || annee || '-' || lpad(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_factures_numero ON public.factures;
CREATE TRIGGER tr_factures_numero
  BEFORE INSERT OR UPDATE OF statut ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.generate_numero_facture();

CREATE OR REPLACE FUNCTION public.valider_facture_brouillon(
  p_facture_id UUID,
  p_actor_id UUID,
  p_selected_options JSONB,
  p_methode_paiement TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture public.factures%ROWTYPE;
  v_item JSONB;
  v_option JSONB;
  v_avoir RECORD;
  v_items JSONB;
  v_taux NUMERIC(5,2);
  v_quantite INTEGER;
  v_prix NUMERIC(10,2);
  v_ligne_ht NUMERIC(10,2);
  v_ligne_tva NUMERIC(10,2);
  v_total_ht NUMERIC(10,2) := 0;
  v_total_tva NUMERIC(10,2) := 0;
  v_total_ttc NUMERIC(10,2) := 0;
  v_solde NUMERIC(10,2);
  v_credit NUMERIC(10,2);
  v_credit_total NUMERIC(10,2) := 0;
  v_statut facture_statut;
BEGIN
  SELECT * INTO v_facture
  FROM public.factures
  WHERE id = p_facture_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;
  IF p_actor_id IS DISTINCT FROM v_facture.dentiste_id
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE id = p_actor_id AND role = 'admin'
     ) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  IF v_facture.statut <> 'brouillon' THEN
    RETURN jsonb_build_object(
      'already_validated', true,
      'facture_id', v_facture.id,
      'numero', v_facture.numero,
      'statut', v_facture.statut
    );
  END IF;
  IF p_methode_paiement NOT IN ('stripe', 'virement') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  v_items := COALESCE(v_facture.billing_snapshot->'items', '[]'::jsonb);
  v_taux := COALESCE((v_facture.billing_snapshot->>'taux_tva')::NUMERIC, 21);
  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Aucune ligne à facturer';
  END IF;

  IF jsonb_typeof(COALESCE(p_selected_options, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'La sélection des options est invalide';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_selected_options, '[]'::jsonb)) AS selected(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_items) AS item(value)
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(item.value->'options', '[]'::jsonb)) AS option(value)
      WHERE item.value->>'commande_item_id' = selected.value->>'commande_item_id'
        AND (option.value->>'id')::UUID = (selected.value->>'service_option_id')::UUID
    )
  ) THEN
    RAISE EXCEPTION 'Une option sélectionnée ne correspond pas à cette ligne de travail';
  END IF;

  IF (SELECT count(*) FROM jsonb_array_elements(COALESCE(p_selected_options, '[]'::jsonb))) <>
     (SELECT count(DISTINCT (value->>'commande_item_id') || ':' || (value->>'service_option_id'))
      FROM jsonb_array_elements(COALESCE(p_selected_options, '[]'::jsonb))) THEN
    RAISE EXCEPTION 'Options sélectionnées en double';
  END IF;

  DELETE FROM public.facture_lignes WHERE facture_id = p_facture_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) AS rows(value) LOOP
    v_quantite := GREATEST(COALESCE((v_item->>'quantite')::INTEGER, 1), 1);
    v_prix := COALESCE((v_item->>'prix_base_ht')::NUMERIC, 0);
    v_ligne_ht := ROUND(v_prix * v_quantite, 2);
    v_ligne_tva := ROUND(v_ligne_ht * v_taux / 100, 2);
    v_total_ht := v_total_ht + v_ligne_ht;
    v_total_tva := v_total_tva + v_ligne_tva;

    INSERT INTO public.facture_lignes (
      facture_id, commande_item_id, service_labo_id, description,
      quantite, prix_unitaire, taux_tva, total_ligne_ht,
      total_ligne_tva, total_ligne_ttc
    ) VALUES (
      p_facture_id,
      NULLIF(v_item->>'commande_item_id', '')::UUID,
      NULLIF(v_item->>'service_id', '')::UUID,
      COALESCE(NULLIF(v_item->>'description', ''), v_item->>'service_nom', 'Travail dentaire'),
      v_quantite, v_prix, v_taux, v_ligne_ht,
      v_ligne_tva, v_ligne_ht + v_ligne_tva
    );

    FOR v_option IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_item->'options', '[]'::jsonb)) AS rows(value)
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(p_selected_options, '[]'::jsonb)) AS selected(value)
        WHERE selected.value->>'commande_item_id' = v_item->>'commande_item_id'
          AND selected.value->>'service_option_id' = value->>'id'
      )
    LOOP
      v_prix := COALESCE((v_option->>'prix_ht')::NUMERIC, 0);
      v_ligne_ht := ROUND(v_prix * v_quantite, 2);
      v_ligne_tva := ROUND(v_ligne_ht * v_taux / 100, 2);
      v_total_ht := v_total_ht + v_ligne_ht;
      v_total_tva := v_total_tva + v_ligne_tva;

      INSERT INTO public.facture_lignes (
        facture_id, commande_item_id, service_labo_id, service_option_id,
        description, quantite, prix_unitaire, taux_tva, total_ligne_ht,
        total_ligne_tva, total_ligne_ttc
      ) VALUES (
        p_facture_id,
        NULLIF(v_item->>'commande_item_id', '')::UUID,
        NULLIF(v_item->>'service_id', '')::UUID,
        (v_option->>'id')::UUID,
        COALESCE(v_item->>'service_nom', 'Travail dentaire') || ' — ' || COALESCE(v_option->>'nom', 'Option'),
        v_quantite, v_prix, v_taux, v_ligne_ht,
        v_ligne_tva, v_ligne_ht + v_ligne_tva
      );
    END LOOP;
  END LOOP;

  v_total_ttc := v_total_ht + v_total_tva;
  v_solde := v_total_ttc;

  FOR v_avoir IN
    SELECT id, numero, solde_restant
    FROM public.avoirs
    WHERE dentiste_id = v_facture.dentiste_id
      AND solde_restant > 0
      AND statut IN ('valide', 'impute')
    ORDER BY date_emission ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_solde <= 0;
    v_credit := ROUND(LEAST(v_avoir.solde_restant, v_solde), 2);

    UPDATE public.avoirs
    SET solde_restant = v_avoir.solde_restant - v_credit,
        statut = CASE WHEN v_avoir.solde_restant - v_credit <= 0 THEN 'impute'::avoir_statut ELSE 'valide'::avoir_statut END
    WHERE id = v_avoir.id;

    INSERT INTO public.ecritures_compte_client (
      dentiste_id, cabinet_id, facture_id, avoir_id,
      type_ecriture, libelle, montant, created_by
    ) VALUES (
      v_facture.dentiste_id, v_facture.cabinet_id, p_facture_id, v_avoir.id,
      'imputation_avoir', 'Imputation ' || v_avoir.numero || ' sur facture', -v_credit, p_actor_id
    );

    v_solde := v_solde - v_credit;
    v_credit_total := v_credit_total + v_credit;
  END LOOP;

  v_statut := CASE
    WHEN v_solde <= 0 THEN 'payee'::facture_statut
    WHEN v_credit_total > 0 THEN 'partiellement_payee'::facture_statut
    ELSE 'emise'::facture_statut
  END;

  UPDATE public.factures
  SET statut = v_statut,
      date_emission = CURRENT_DATE,
      date_echeance = CURRENT_DATE + 30,
      montant_ht = v_total_ht,
      montant_tva = v_total_tva,
      montant_ttc = v_total_ttc,
      solde_du = GREATEST(v_solde, 0),
      validated_at = now(),
      methode_paiement = p_methode_paiement
  WHERE id = p_facture_id;

  INSERT INTO public.ecritures_compte_client (
    dentiste_id, cabinet_id, facture_id, type_ecriture,
    libelle, montant, created_by
  ) VALUES (
    v_facture.dentiste_id, v_facture.cabinet_id, p_facture_id,
    'facture', 'Facture ' || (SELECT numero FROM public.factures WHERE id = p_facture_id),
    v_total_ttc, p_actor_id
  );

  UPDATE public.commandes
  SET montant_total = v_total_ttc,
      statut_paiement = CASE WHEN v_solde <= 0 THEN 'paye' ELSE 'en_attente' END
  WHERE id = v_facture.commande_id;

  RETURN jsonb_build_object(
    'already_validated', false,
    'facture_id', p_facture_id,
    'numero', (SELECT numero FROM public.factures WHERE id = p_facture_id),
    'montant_ht', v_total_ht,
    'montant_tva', v_total_tva,
    'montant_ttc', v_total_ttc,
    'solde_du', GREATEST(v_solde, 0),
    'statut', v_statut
  );
END;
$$;

REVOKE ALL ON FUNCTION public.valider_facture_brouillon(UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.valider_facture_brouillon(UUID, UUID, JSONB, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.appliquer_paiement_facture(
  p_paiement_id UUID,
  p_payment_intent_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paiement public.paiements%ROWTYPE;
  v_facture public.factures%ROWTYPE;
  v_solde NUMERIC(10,2);
  v_statut facture_statut;
BEGIN
  SELECT * INTO v_paiement
  FROM public.paiements
  WHERE id = p_paiement_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF v_paiement.statut = 'paye' THEN
    RETURN jsonb_build_object('already_applied', true);
  END IF;
  IF v_paiement.facture_id IS NULL THEN
    RAISE EXCEPTION 'Paiement non lié à une facture';
  END IF;

  SELECT * INTO v_facture
  FROM public.factures
  WHERE id = v_paiement.facture_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
  IF v_paiement.montant > v_facture.solde_du THEN
    RAISE EXCEPTION 'Le paiement dépasse le solde restant';
  END IF;

  v_solde := GREATEST(0, ROUND(v_facture.solde_du - v_paiement.montant, 2));
  v_statut := CASE WHEN v_solde <= 0 THEN 'payee'::facture_statut ELSE 'partiellement_payee'::facture_statut END;

  UPDATE public.paiements
  SET statut = 'paye', stripe_payment_intent_id = p_payment_intent_id
  WHERE id = v_paiement.id;

  UPDATE public.factures
  SET solde_du = v_solde, statut = v_statut
  WHERE id = v_facture.id;

  INSERT INTO public.ecritures_compte_client (
    dentiste_id, cabinet_id, facture_id, paiement_id,
    type_ecriture, libelle, montant
  ) VALUES (
    v_facture.dentiste_id, v_facture.cabinet_id, v_facture.id, v_paiement.id,
    'paiement', 'Paiement Stripe sur ' || v_facture.numero, -v_paiement.montant
  );

  IF v_solde <= 0 THEN
    UPDATE public.commandes
    SET statut_paiement = 'paye'
    WHERE id = v_facture.commande_id;
  END IF;

  RETURN jsonb_build_object('already_applied', false, 'solde_du', v_solde, 'statut', v_statut);
END;
$$;

REVOKE ALL ON FUNCTION public.appliquer_paiement_facture(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.appliquer_paiement_facture(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.enregistrer_paiement_facture(
  p_facture_id UUID,
  p_admin_id UUID,
  p_montant NUMERIC,
  p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture public.factures%ROWTYPE;
  v_paiement_id UUID;
  v_montant NUMERIC(10,2);
  v_solde NUMERIC(10,2);
  v_statut facture_statut;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  IF p_montant IS NULL OR p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à zéro';
  END IF;
  v_montant := ROUND(p_montant, 2);
  IF v_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être supérieur à zéro';
  END IF;

  SELECT * INTO v_facture
  FROM public.factures
  WHERE id = p_facture_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture introuvable'; END IF;
  IF v_facture.statut = 'brouillon' OR v_facture.statut = 'annulee' THEN
    RAISE EXCEPTION 'Cette facture ne peut pas recevoir de paiement';
  END IF;
  IF v_montant > v_facture.solde_du THEN
    RAISE EXCEPTION 'Le paiement dépasse le solde restant';
  END IF;

  INSERT INTO public.paiements (
    commande_id, facture_id, montant, devise, statut,
    methode, reference_externe, enregistre_par
  ) VALUES (
    v_facture.commande_id, v_facture.id, v_montant, v_facture.devise,
    'paye', 'virement', NULLIF(trim(p_reference), ''), p_admin_id
  ) RETURNING id INTO v_paiement_id;

  v_solde := ROUND(v_facture.solde_du - v_montant, 2);
  v_statut := CASE
    WHEN v_solde <= 0 THEN 'payee'::facture_statut
    ELSE 'partiellement_payee'::facture_statut
  END;

  UPDATE public.factures
  SET solde_du = GREATEST(v_solde, 0), statut = v_statut
  WHERE id = v_facture.id;

  INSERT INTO public.ecritures_compte_client (
    dentiste_id, cabinet_id, facture_id, paiement_id,
    type_ecriture, libelle, montant, created_by
  ) VALUES (
    v_facture.dentiste_id, v_facture.cabinet_id, v_facture.id, v_paiement_id,
    'paiement', 'Virement reçu sur ' || v_facture.numero, -v_montant, p_admin_id
  );

  IF v_solde <= 0 THEN
    UPDATE public.commandes
    SET statut_paiement = 'paye'
    WHERE id = v_facture.commande_id;
  END IF;

  RETURN jsonb_build_object(
    'paiement_id', v_paiement_id,
    'solde_du', GREATEST(v_solde, 0),
    'statut', v_statut
  );
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_paiement_facture(UUID, UUID, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enregistrer_paiement_facture(UUID, UUID, NUMERIC, TEXT) TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('factures', 'factures', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS factures_pdf_read_own ON storage.objects;
CREATE POLICY factures_pdf_read_own
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'factures'
    AND (
      (storage.foldername(name))[1] = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

COMMIT;