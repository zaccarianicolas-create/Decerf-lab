BEGIN;

LOCK TABLE public.conversations, public.messages, public.conversation_participants IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  dentist RECORD;
  source_conversation RECORD;
  target_id UUID;
  latest_activity TIMESTAMPTZ;
  message_count BIGINT;
BEGIN
  SELECT count(*) INTO message_count FROM public.messages;
  FOR dentist IN SELECT DISTINCT dentiste_id FROM public.conversations LOOP
    SELECT id INTO target_id
    FROM public.conversations
    WHERE dentiste_id = dentist.dentiste_id
    ORDER BY (commande_id IS NULL) DESC, created_at, id
    LIMIT 1;

    SELECT max(derniere_activite) INTO latest_activity
    FROM public.conversations WHERE dentiste_id = dentist.dentiste_id;

    FOR source_conversation IN
      SELECT conversation.id, commande.numero
      FROM public.conversations conversation
      LEFT JOIN public.commandes commande ON commande.id = conversation.commande_id
      WHERE conversation.dentiste_id = dentist.dentiste_id
    LOOP
      IF source_conversation.numero IS NOT NULL THEN
        UPDATE public.messages
        SET contenu = '[Commande ' || source_conversation.numero || ']' ||
          CASE WHEN contenu IS NULL OR contenu = '' THEN '' ELSE E'\n' || contenu END
        WHERE conversation_id = source_conversation.id AND deleted_at IS NULL;
      END IF;

      IF source_conversation.id <> target_id THEN
        INSERT INTO public.conversation_participants (conversation_id, user_id, role, joined_at, last_read_at)
        SELECT target_id, user_id, role, joined_at, last_read_at
        FROM public.conversation_participants WHERE conversation_id = source_conversation.id
        ON CONFLICT (conversation_id, user_id) DO UPDATE
        SET joined_at = least(conversation_participants.joined_at, EXCLUDED.joined_at),
            last_read_at = greatest(conversation_participants.last_read_at, EXCLUDED.last_read_at);

        UPDATE public.messages SET conversation_id = target_id
        WHERE conversation_id = source_conversation.id;
        DELETE FROM public.conversations WHERE id = source_conversation.id;
      END IF;
    END LOOP;

    UPDATE public.conversations
    SET commande_id = NULL, titre = 'Conversation avec DECERF LAB', derniere_activite = latest_activity
    WHERE id = target_id;
  END LOOP;

  IF (SELECT count(*) FROM public.messages) <> message_count THEN
    RAISE EXCEPTION 'Message count changed during conversation merge';
  END IF;
END;
$$;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_one_per_dentist UNIQUE (dentiste_id),
  ADD CONSTRAINT conversations_not_order_specific CHECK (commande_id IS NULL);

CREATE FUNCTION public.get_or_create_dentist_conversation(p_dentiste_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR (role = 'dentiste' AND id = p_dentiste_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO conversation_id FROM public.conversations WHERE dentiste_id = p_dentiste_id;
  IF conversation_id IS NOT NULL THEN
    RETURN conversation_id;
  END IF;

  INSERT INTO public.conversations (dentiste_id, titre)
  VALUES (p_dentiste_id, 'Conversation avec DECERF LAB')
  ON CONFLICT (dentiste_id) DO NOTHING
  RETURNING id INTO conversation_id;

  IF conversation_id IS NULL THEN
    SELECT id INTO conversation_id FROM public.conversations WHERE dentiste_id = p_dentiste_id;
  END IF;
  RETURN conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_dentist_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_dentist_conversation(UUID) TO authenticated;

COMMIT;