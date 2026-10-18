BEGIN;

DROP POLICY IF EXISTS "Admin creates conversations" ON public.conversations;
CREATE POLICY "Admin creates conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles dentist_profile
      WHERE dentist_profile.id = conversations.dentiste_id
        AND dentist_profile.role = 'dentiste'
        AND dentist_profile.actif = true
        AND dentist_profile.statut_compte = 'approuve'
    )
  );

CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET derniere_activite = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "reactions_insert_own" ON public.message_reactions;
CREATE POLICY "reactions_insert_own"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.messages message
      JOIN public.conversations conversation ON conversation.id = message.conversation_id
      WHERE message.id = message_reactions.message_id
        AND (
          conversation.dentiste_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
          )
          OR EXISTS (
            SELECT 1 FROM public.conversation_participants participant
            WHERE participant.conversation_id = conversation.id
              AND participant.user_id = auth.uid()
          )
        )
    )
  );

COMMIT;