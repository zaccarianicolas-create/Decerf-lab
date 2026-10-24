BEGIN;

ALTER TABLE public.parametres_labo
  ADD COLUMN IF NOT EXISTS numero_entreprise TEXT,
  ADD COLUMN IF NOT EXISTS regime_tva TEXT NOT NULL DEFAULT 'franchise',
  ADD COLUMN IF NOT EXISTS mention_franchise_tva TEXT NOT NULL
    DEFAULT 'Régime particulier de franchise des petites entreprises';

UPDATE public.parametres_labo
SET regime_tva = 'franchise'
WHERE regime_tva IS NULL;

ALTER TABLE public.parametres_labo
  DROP CONSTRAINT IF EXISTS parametres_labo_regime_tva_check;
ALTER TABLE public.parametres_labo
  ADD CONSTRAINT parametres_labo_regime_tva_check
  CHECK (regime_tva IN ('franchise', 'normal'));

ALTER TABLE public.services_labo
  ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,2) NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS categorie_tva_peppol TEXT NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS motif_exoneration_tva TEXT;

ALTER TABLE public.services_labo
  DROP CONSTRAINT IF EXISTS services_labo_categorie_tva_peppol_check;
ALTER TABLE public.services_labo
  ADD CONSTRAINT services_labo_categorie_tva_peppol_check
  CHECK (categorie_tva_peppol IN ('S', 'Z', 'E'));

ALTER TABLE public.service_options
  ADD COLUMN IF NOT EXISTS taux_tva NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS categorie_tva_peppol TEXT,
  ADD COLUMN IF NOT EXISTS motif_exoneration_tva TEXT;

ALTER TABLE public.service_options
  DROP CONSTRAINT IF EXISTS service_options_categorie_tva_peppol_check;
ALTER TABLE public.service_options
  ADD CONSTRAINT service_options_categorie_tva_peppol_check
  CHECK (categorie_tva_peppol IS NULL OR categorie_tva_peppol IN ('S', 'Z', 'E'));

ALTER TABLE public.facture_lignes
  ADD COLUMN IF NOT EXISTS categorie_tva_peppol TEXT NOT NULL DEFAULT 'S',
  ADD COLUMN IF NOT EXISTS motif_exoneration_tva TEXT;

ALTER TABLE public.facture_lignes
  DROP CONSTRAINT IF EXISTS facture_lignes_categorie_tva_peppol_check;
ALTER TABLE public.facture_lignes
  ADD CONSTRAINT facture_lignes_categorie_tva_peppol_check
  CHECK (categorie_tva_peppol IN ('S', 'Z', 'E'));

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
  v_item_taux NUMERIC(5,2);
  v_option_taux NUMERIC(5,2);
  v_item_categorie TEXT;
  v_option_categorie TEXT;
  v_item_motif TEXT;
  v_option_motif TEXT;
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
    v_item_taux := COALESCE((v_item->>'taux_tva')::NUMERIC, v_taux);
    v_item_categorie := COALESCE(
      NULLIF(v_item->>'categorie_tva_peppol', ''),
      CASE WHEN v_item_taux = 0 THEN 'Z' ELSE 'S' END
    );
    IF (v_item_categorie = 'S' AND v_item_taux <= 0)
       OR (v_item_categorie IN ('Z', 'E') AND v_item_taux <> 0) THEN
      RAISE EXCEPTION 'Taux de TVA incohérent pour la catégorie %', v_item_categorie;
    END IF;
    IF v_item_categorie = 'E' AND NULLIF(v_item->>'motif_exoneration_tva', '') IS NULL THEN
      RAISE EXCEPTION 'Motif d’exonération manquant pour la ligne %', v_item->>'service_nom';
    END IF;
    v_item_motif := NULLIF(v_item->>'motif_exoneration_tva', '');
    v_ligne_ht := ROUND(v_prix * v_quantite, 2);
    v_ligne_tva := ROUND(v_ligne_ht * v_item_taux / 100, 2);
    v_total_ht := v_total_ht + v_ligne_ht;
    v_total_tva := v_total_tva + v_ligne_tva;

    INSERT INTO public.facture_lignes (
      facture_id, commande_item_id, service_labo_id, description,
      quantite, prix_unitaire, taux_tva, categorie_tva_peppol,
      motif_exoneration_tva, total_ligne_ht, total_ligne_tva, total_ligne_ttc
    ) VALUES (
      p_facture_id,
      NULLIF(v_item->>'commande_item_id', '')::UUID,
      NULLIF(v_item->>'service_id', '')::UUID,
      COALESCE(NULLIF(v_item->>'description', ''), v_item->>'service_nom', 'Travail dentaire'),
      v_quantite, v_prix, v_item_taux, v_item_categorie,
      v_item_motif, v_ligne_ht, v_ligne_tva, v_ligne_ht + v_ligne_tva
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
      v_option_categorie := COALESCE(
        NULLIF(v_option->>'categorie_tva_peppol', ''),
        CASE
          WHEN v_option->>'taux_tva' IS NOT NULL THEN CASE WHEN (v_option->>'taux_tva')::NUMERIC = 0 THEN 'Z' ELSE 'S' END
          ELSE v_item_categorie
        END
      );
      v_option_taux := COALESCE(
        (v_option->>'taux_tva')::NUMERIC,
        CASE WHEN v_option_categorie IN ('Z', 'E') THEN 0 ELSE v_item_taux END
      );
      IF (v_option_categorie = 'S' AND v_option_taux <= 0)
         OR (v_option_categorie IN ('Z', 'E') AND v_option_taux <> 0) THEN
        RAISE EXCEPTION 'Taux de TVA incohérent pour l’option %', v_option->>'nom';
      END IF;
      v_option_motif := COALESCE(
        NULLIF(v_option->>'motif_exoneration_tva', ''),
        v_item_motif
      );
      IF v_option_categorie = 'E' AND v_option_motif IS NULL THEN
        RAISE EXCEPTION 'Motif d’exonération manquant pour l’option %', v_option->>'nom';
      END IF;
      v_ligne_ht := ROUND(v_prix * v_quantite, 2);
      v_ligne_tva := ROUND(v_ligne_ht * v_option_taux / 100, 2);
      v_total_ht := v_total_ht + v_ligne_ht;
      v_total_tva := v_total_tva + v_ligne_tva;

      INSERT INTO public.facture_lignes (
        facture_id, commande_item_id, service_labo_id, service_option_id,
        description, quantite, prix_unitaire, taux_tva, categorie_tva_peppol,
        motif_exoneration_tva, total_ligne_ht, total_ligne_tva, total_ligne_ttc
      ) VALUES (
        p_facture_id,
        NULLIF(v_item->>'commande_item_id', '')::UUID,
        NULLIF(v_item->>'service_id', '')::UUID,
        (v_option->>'id')::UUID,
        COALESCE(v_item->>'service_nom', 'Travail dentaire') || ' — ' || COALESCE(v_option->>'nom', 'Option'),
        v_quantite, v_prix, v_option_taux, v_option_categorie,
        v_option_motif, v_ligne_ht, v_ligne_tva, v_ligne_ht + v_ligne_tva
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
    v_facture.dentiste_id, v_facture.cabinet_id, p_facture_id, 'facture',
    'Facture ' || (SELECT numero FROM public.factures WHERE id = p_facture_id),
    v_total_ttc, p_actor_id
  );

  UPDATE public.commandes
  SET montant_total = v_total_ttc,
      statut_paiement = CASE
        WHEN v_solde <= 0 THEN 'paye'::public.statut_paiement
        ELSE 'en_attente'::public.statut_paiement
      END
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

COMMIT;