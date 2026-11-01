BEGIN;
ALTER FUNCTION public.valider_facture_brouillon(UUID,UUID,JSONB,TEXT) RENAME TO finaliser_facture_labo;
REVOKE ALL ON FUNCTION public.finaliser_facture_labo(UUID,UUID,JSONB,TEXT) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.valider_facture_brouillon(p_facture_id UUID,p_actor_id UUID,p_selected_options JSONB,p_methode_paiement TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor_id AND role='admin' AND actif=TRUE AND statut_compte='approuve') THEN
    RAISE EXCEPTION 'Émission réservée au laboratoire' USING ERRCODE='42501';
  END IF;
  RETURN public.finaliser_facture_labo(p_facture_id,p_actor_id,p_selected_options,p_methode_paiement);
END; $$;
REVOKE ALL ON FUNCTION public.valider_facture_brouillon(UUID,UUID,JSONB,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valider_facture_brouillon(UUID,UUID,JSONB,TEXT) TO service_role;
COMMIT;