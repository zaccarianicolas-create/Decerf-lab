CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_updated_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.dentiste_id = v_user_id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = v_user_id AND p.role = 'admin'
        )
        OR EXISTS (
          SELECT 1 FROM public.conversation_participants cp
          WHERE cp.conversation_id = c.id AND cp.user_id = v_user_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Conversation inaccessible';
  END IF;

  UPDATE public.messages
  SET lu = TRUE
  WHERE conversation_id = p_conversation_id
    AND auteur_id <> v_user_id
    AND lu = FALSE;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_messages_read(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(UUID) TO authenticated;
