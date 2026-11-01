BEGIN;
ALTER TABLE public.contact_messages
  ADD COLUMN read_at TIMESTAMPTZ,
  ADD COLUMN read_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN traite_at TIMESTAMPTZ,
  ADD COLUMN traite_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE FUNCTION public.admin_contact_action(p_contact_id UUID,p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  result public.contact_messages;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND actif=TRUE AND statut_compte='approuve'
  ) THEN RAISE EXCEPTION 'Non autorisé' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('lire','traiter','reouvrir') OR p_action IS NULL THEN RAISE EXCEPTION 'Action invalide'; END IF;
  UPDATE public.contact_messages
  SET read_at=CASE WHEN p_action IN ('lire','traiter') THEN coalesce(read_at,now()) ELSE read_at END,
      read_by=CASE WHEN p_action IN ('lire','traiter') THEN coalesce(read_by,auth.uid()) ELSE read_by END,
      traite=CASE WHEN p_action='traiter' THEN TRUE WHEN p_action='reouvrir' THEN FALSE ELSE traite END,
      traite_at=CASE WHEN p_action='traiter' THEN coalesce(traite_at,now()) WHEN p_action='reouvrir' THEN NULL ELSE traite_at END,
      traite_by=CASE WHEN p_action='traiter' THEN coalesce(traite_by,auth.uid()) WHEN p_action='reouvrir' THEN NULL ELSE traite_by END
  WHERE id=p_contact_id RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Demande introuvable'; END IF;
  RETURN jsonb_build_object('id',result.id,'read_at',result.read_at,'traite',result.traite,'traite_at',result.traite_at);
END; $$;
REVOKE ALL ON FUNCTION public.admin_contact_action(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_contact_action(UUID,TEXT) TO authenticated;
CREATE INDEX contact_messages_unread_idx ON public.contact_messages(created_at DESC) WHERE read_at IS NULL AND traite=FALSE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='contact_messages'
  ) THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages; END IF;
END; $$;
COMMIT;