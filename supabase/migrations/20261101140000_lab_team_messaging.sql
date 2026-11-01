BEGIN;

ALTER TABLE public.conversations
  ALTER COLUMN dentiste_id DROP NOT NULL,
  ADD COLUMN private_user_low UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN private_user_high UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT conversations_private_pair_unique UNIQUE (private_user_low, private_user_high),
  ADD CONSTRAINT conversations_chat_kind CHECK (
    (dentiste_id IS NOT NULL AND private_user_low IS NULL AND private_user_high IS NULL)
    OR (dentiste_id IS NULL AND private_user_low IS NOT NULL AND private_user_high IS NOT NULL
      AND private_user_low < private_user_high)
  );

CREATE FUNCTION public.is_active_lab_member(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND actif = TRUE AND statut_compte = 'approuve'
      AND (role = 'admin' OR (role = 'technicien' AND actif_collaborateur = TRUE))
  );
$$;

CREATE FUNCTION public.can_access_lab_conversation(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations conversation
    WHERE conversation.id = p_conversation_id AND (
      (conversation.dentiste_id IS NOT NULL AND public.is_active_lab_member(auth.uid()))
      OR (conversation.dentiste_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'dentiste' AND actif = TRUE AND statut_compte = 'approuve'
      ))
      OR (conversation.dentiste_id IS NULL AND public.is_active_lab_member(auth.uid())
        AND auth.uid() IN (conversation.private_user_low, conversation.private_user_high))
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_lab_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_lab_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_lab_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lab_conversation(UUID) TO authenticated;

DROP POLICY IF EXISTS "Voir ses conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participants" ON public.conversations;
DROP POLICY IF EXISTS "Créer conversation" ON public.conversations;
DROP POLICY IF EXISTS "Admin creates conversations" ON public.conversations;
CREATE POLICY "lab_conversations_read" ON public.conversations FOR SELECT TO authenticated
  USING (public.can_access_lab_conversation(id));
CREATE POLICY "lab_conversations_create" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (dentiste_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles dentist
      WHERE dentist.id = conversations.dentiste_id AND dentist.role = 'dentiste'
        AND dentist.actif = TRUE AND dentist.statut_compte = 'approuve'
    ) AND (dentiste_id = auth.uid() OR public.is_active_lab_member(auth.uid())))
    OR (dentiste_id IS NULL AND auth.uid() IN (private_user_low, private_user_high)
      AND public.is_active_lab_member(private_user_low) AND public.is_active_lab_member(private_user_high))
  );

DROP POLICY IF EXISTS "Voir messages de ses conversations" ON public.messages;
DROP POLICY IF EXISTS "Envoyer messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "lab_messages_read" ON public.messages FOR SELECT TO authenticated
  USING (public.can_access_lab_conversation(conversation_id));
CREATE POLICY "lab_messages_create" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auteur_id = auth.uid() AND public.can_access_lab_conversation(conversation_id)
    AND (reply_to_id IS NULL OR EXISTS (
      SELECT 1 FROM public.messages original
      WHERE original.id = messages.reply_to_id AND original.conversation_id = messages.conversation_id
    )));
CREATE POLICY "lab_messages_update" ON public.messages FOR UPDATE TO authenticated
  USING (auteur_id = auth.uid() AND public.can_access_lab_conversation(conversation_id))
  WITH CHECK (auteur_id = auth.uid() AND public.can_access_lab_conversation(conversation_id));

DROP POLICY IF EXISTS "conv_participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_participants_admin_all" ON public.conversation_participants;
CREATE POLICY "lab_participants_read" ON public.conversation_participants FOR SELECT TO authenticated
  USING (public.can_access_lab_conversation(conversation_id));

DROP POLICY IF EXISTS "reactions_select" ON public.message_reactions;
DROP POLICY IF EXISTS "reactions_insert_own" ON public.message_reactions;
DROP POLICY IF EXISTS "reactions_delete_own" ON public.message_reactions;
CREATE POLICY "lab_reactions_read" ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.messages message WHERE message.id = message_reactions.message_id));
CREATE POLICY "lab_reactions_create" ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages message WHERE message.id = message_reactions.message_id
  ));
CREATE POLICY "lab_reactions_delete" ON public.message_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages message WHERE message.id = message_reactions.message_id
  ));

DROP POLICY IF EXISTS "messages_storage_read" ON storage.objects;
CREATE POLICY "messages_storage_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'messages' AND EXISTS (
    SELECT 1 FROM public.messages message
    WHERE message.attachment_path = storage.objects.name
      AND public.can_access_lab_conversation(message.conversation_id)
  ));
DROP POLICY IF EXISTS "messages_storage_insert" ON storage.objects;
CREATE POLICY "messages_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'messages'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
    AND public.can_access_lab_conversation(((storage.foldername(name))[1])::UUID));

CREATE OR REPLACE FUNCTION public.get_or_create_dentist_conversation(p_dentiste_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  conversation_id UUID;
BEGIN
  IF NOT (public.is_active_lab_member(auth.uid()) OR auth.uid() = p_dentiste_id)
    OR auth.uid() IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_dentiste_id AND role = 'dentiste' AND actif = TRUE AND statut_compte = 'approuve'
    ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.conversations (dentiste_id, titre)
  VALUES (p_dentiste_id, 'Conversation avec DECERF LAB')
  ON CONFLICT (dentiste_id) DO NOTHING RETURNING id INTO conversation_id;
  IF conversation_id IS NULL THEN
    SELECT id INTO conversation_id FROM public.conversations WHERE dentiste_id = p_dentiste_id;
  END IF;
  RETURN conversation_id;
END;
$$;

CREATE FUNCTION public.get_or_create_internal_conversation(p_recipient_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  low_id UUID := least(auth.uid(), p_recipient_id);
  high_id UUID := greatest(auth.uid(), p_recipient_id);
  conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = p_recipient_id
    OR NOT public.is_active_lab_member(auth.uid()) OR NOT public.is_active_lab_member(p_recipient_id) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.conversations (private_user_low, private_user_high, titre)
  VALUES (low_id, high_id, 'Échange interne')
  ON CONFLICT (private_user_low, private_user_high) DO NOTHING RETURNING id INTO conversation_id;
  IF conversation_id IS NULL THEN
    SELECT id INTO conversation_id FROM public.conversations
    WHERE private_user_low = low_id AND private_user_high = high_id;
  END IF;
  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_messages_read(p_conversation_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
  last_read TIMESTAMPTZ;
  read_until TIMESTAMPTZ := now();
BEGIN
  IF NOT public.can_access_lab_conversation(p_conversation_id) THEN
    RAISE EXCEPTION 'Conversation inaccessible' USING ERRCODE = '42501';
  END IF;
  SELECT last_read_at INTO last_read FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  SELECT count(*) INTO updated_count FROM public.messages
  WHERE conversation_id = p_conversation_id AND auteur_id <> auth.uid()
    AND deleted_at IS NULL AND created_at > coalesce(last_read, '-infinity'::TIMESTAMPTZ)
    AND created_at <= read_until;
  INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, auth.uid(), read_until)
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET last_read_at = greatest(conversation_participants.last_read_at, EXCLUDED.last_read_at);
  RETURN updated_count;
END;
$$;

CREATE FUNCTION public.get_chat_unread_counts()
RETURNS TABLE (conversation_id UUID, unread_count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT conversation.id, count(message.id)
  FROM public.conversations conversation
  LEFT JOIN public.conversation_participants participant
    ON participant.conversation_id = conversation.id AND participant.user_id = auth.uid()
  JOIN public.messages message ON message.conversation_id = conversation.id
    AND message.auteur_id <> auth.uid() AND message.deleted_at IS NULL
    AND message.created_at > coalesce(participant.last_read_at, '-infinity'::TIMESTAMPTZ)
  WHERE public.can_access_lab_conversation(conversation.id)
  GROUP BY conversation.id;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_dentist_conversation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_or_create_internal_conversation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_messages_read(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_chat_unread_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_dentist_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_internal_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_chat_unread_counts() TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversation_participants'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END;
$$;

COMMIT;