CREATE OR REPLACE FUNCTION public.finaliser_avoir_billit(
  p_avoir_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avoir public.avoirs%ROWTYPE;
  v_facture public.factures%ROWTYPE;
  v_applique NUMERIC(10,2);
  v_restant NUMERIC(10,2);
  v_solde NUMERIC(10,2);
  v_autres_avoirs NUMERIC(10,2);
  v_statut_facture facture_statut;
  v_statut_avoir avoir_statut;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  SELECT * INTO v_avoir
  FROM public.avoirs
  WHERE id = p_avoir_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Avoir introuvable'; END IF;
  IF v_avoir.statut IN ('valide', 'impute') THEN
    RETURN jsonb_build_object('already_finalized', true, 'avoir_id', v_avoir.id);
  END IF;
  IF v_avoir.statut <> 'brouillon' OR v_avoir.billit_order_id IS NULL THEN
    RAISE EXCEPTION 'L’avoir doit être un brouillon créé dans Billit avant finalisation';
  END IF;

  SELECT * INTO v_facture
  FROM public.factures
  WHERE id = v_avoir.facture_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Facture d’origine introuvable'; END IF;
  IF v_facture.billit_order_id IS NULL OR v_facture.statut IN ('brouillon', 'annulee') THEN
    RAISE EXCEPTION 'La facture d’origine doit être émise par Billit';
  END IF;

  SELECT COALESCE(SUM(montant), 0)
  INTO v_autres_avoirs
  FROM public.avoirs
  WHERE facture_id = v_facture.id
    AND id <> v_avoir.id
    AND statut <> 'annule';
  IF v_autres_avoirs + v_avoir.montant > v_facture.montant_ttc THEN
    RAISE EXCEPTION 'Le total des avoirs dépasserait le montant de la facture';
  END IF;

  v_applique := ROUND(LEAST(v_avoir.montant, v_facture.solde_du), 2);
  v_restant := ROUND(v_avoir.montant - v_applique, 2);
  v_solde := GREATEST(0, ROUND(v_facture.solde_du - v_applique, 2));
  v_statut_avoir := CASE WHEN v_restant = 0 THEN 'impute'::avoir_statut ELSE 'valide'::avoir_statut END;
  v_statut_facture := CASE
    WHEN v_autres_avoirs + v_avoir.montant >= v_facture.montant_ttc THEN 'annulee'::facture_statut
    WHEN v_solde = 0 THEN 'payee'::facture_statut
    WHEN v_solde < v_facture.montant_ttc THEN 'partiellement_payee'::facture_statut
    ELSE 'emise'::facture_statut
  END;

  UPDATE public.avoirs
  SET statut = v_statut_avoir,
      solde_restant = v_restant
  WHERE id = v_avoir.id;

  UPDATE public.factures
  SET solde_du = v_solde,
      statut = v_statut_facture
  WHERE id = v_facture.id;

  INSERT INTO public.ecritures_compte_client (
    dentiste_id, cabinet_id, facture_id, avoir_id,
    type_ecriture, libelle, montant, created_by
  ) VALUES (
    v_facture.dentiste_id, v_facture.cabinet_id, v_facture.id, v_avoir.id,
    'avoir', 'Avoir Billit ' || v_avoir.numero, v_avoir.montant, p_admin_id
  );

  IF v_applique > 0 THEN
    INSERT INTO public.ecritures_compte_client (
      dentiste_id, cabinet_id, facture_id, avoir_id,
      type_ecriture, libelle, montant, created_by
    ) VALUES (
      v_facture.dentiste_id, v_facture.cabinet_id, v_facture.id, v_avoir.id,
      'imputation_avoir', 'Imputation de l’avoir ' || v_avoir.numero || ' sur ' || v_facture.numero,
      -v_applique, p_admin_id
    );
  END IF;

  RETURN jsonb_build_object(
    'already_finalized', false,
    'avoir_id', v_avoir.id,
    'montant', v_avoir.montant,
    'montant_impute', v_applique,
    'solde_restant', v_restant,
    'facture_solde_du', v_solde,
    'facture_statut', v_statut_facture
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finaliser_avoir_billit(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finaliser_avoir_billit(UUID, UUID) TO service_role;
