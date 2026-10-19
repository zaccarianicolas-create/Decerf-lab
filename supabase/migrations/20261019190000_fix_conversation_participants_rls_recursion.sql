BEGIN;

CREATE OR REPLACE FUNCTION public.is_current_user_conversation_participant(
  p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants participant
    WHERE participant.conversation_id = p_conversation_id
      AND participant.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_conversation_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_conversation_participant(UUID) TO authenticated;

DROP POLICY IF EXISTS "conv_participants_select" ON public.conversation_participants;
CREATE POLICY "conv_participants_select"
  ON public.conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_current_user_conversation_participant(conversation_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles profile
      WHERE profile.id = (SELECT auth.uid())
        AND profile.role = 'admin'
    )
  );

COMMIT;