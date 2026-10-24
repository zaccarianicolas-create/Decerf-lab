BEGIN;

DO $$
DECLARE
  function_definition TEXT;
  corrected_definition TEXT;
  old_fragment CONSTANT TEXT := 'CASE WHEN v_solde <= 0 THEN ''paye'' ELSE ''en_attente'' END';
  new_fragment CONSTANT TEXT := 'CASE WHEN v_solde <= 0 THEN ''paye''::public.statut_paiement ELSE ''en_attente''::public.statut_paiement END';
BEGIN
  SELECT pg_get_functiondef(
    'public.valider_facture_brouillon(uuid,uuid,jsonb,text)'::regprocedure
  ) INTO function_definition;

  IF position(old_fragment IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Expected statut_paiement CASE was not found in valider_facture_brouillon';
  END IF;

  corrected_definition := replace(function_definition, old_fragment, new_fragment);
  EXECUTE corrected_definition;
END;
$$;

COMMIT;
