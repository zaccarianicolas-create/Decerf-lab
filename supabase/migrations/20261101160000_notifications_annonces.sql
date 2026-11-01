BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN email_annonce BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN email_promotion BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN promotion_consent_at TIMESTAMPTZ;
DROP POLICY IF EXISTS "notif_prefs_admin_all" ON public.notification_preferences;

CREATE FUNCTION public.record_notification_consent()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.email_promotion AND (TG_OP = 'INSERT' OR NOT OLD.email_promotion) THEN
    NEW.promotion_consent_at := now();
  ELSIF NOT NEW.email_promotion THEN
    NEW.promotion_consent_at := NULL;
  ELSE
    NEW.promotion_consent_at := OLD.promotion_consent_at;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER notification_consent BEFORE INSERT OR UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.record_notification_consent();

DROP FUNCTION public.mark_conversation_messages_read(UUID);
CREATE FUNCTION public.mark_conversation_messages_read(p_conversation_id UUID, p_read_until TIMESTAMPTZ DEFAULT now())
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  updated_count INTEGER;
  last_read TIMESTAMPTZ;
  read_until TIMESTAMPTZ := least(p_read_until, now());
BEGIN
  IF NOT public.can_access_lab_conversation(p_conversation_id) OR read_until IS NULL THEN
    RAISE EXCEPTION 'Conversation inaccessible' USING ERRCODE = '42501';
  END IF;
  SELECT last_read_at INTO last_read FROM public.conversation_participants
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  SELECT count(*) INTO updated_count FROM public.messages
  WHERE conversation_id = p_conversation_id AND auteur_id <> auth.uid() AND deleted_at IS NULL
    AND created_at > coalesce(last_read, '-infinity'::TIMESTAMPTZ) AND created_at <= read_until;
  INSERT INTO public.conversation_participants (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, auth.uid(), read_until)
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET last_read_at = greatest(conversation_participants.last_read_at, EXCLUDED.last_read_at);
  RETURN updated_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_conversation_messages_read(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_read(UUID, TIMESTAMPTZ) TO authenticated;

CREATE TABLE public.lab_annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titre TEXT NOT NULL CHECK (char_length(titre) BETWEEN 1 AND 160),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 8000),
  categorie TEXT NOT NULL CHECK (categorie IN ('information', 'fermeture', 'voeux', 'promotion')),
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'publie', 'archive')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  send_email BOOLEAN NOT NULL DEFAULT FALSE,
  attachment_path TEXT,
  attachment_name TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  CHECK ((attachment_path IS NULL) = (attachment_name IS NULL))
);
CREATE TABLE public.lab_annonce_reads (
  annonce_id UUID NOT NULL REFERENCES public.lab_annonces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (annonce_id, user_id)
);
ALTER TABLE public.lab_annonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_annonce_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "annonces_admin" ON public.lab_annonces FOR ALL TO authenticated
  USING (public.is_active_lab_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND actif = TRUE));
CREATE POLICY "annonces_dentistes" ON public.lab_annonces FOR SELECT TO authenticated
  USING (statut = 'publie' AND starts_at <= now() AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dentiste' AND actif = TRUE AND statut_compte = 'approuve'
  ));
CREATE POLICY "annonce_reads_own" ON public.lab_annonce_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "annonce_reads_create" ON public.lab_annonce_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.lab_annonces WHERE id = annonce_id AND statut = 'publie' AND starts_at <= now()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('annonces', 'annonces', FALSE, 5242880, ARRAY['image/png','image/jpeg','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "annonce_files_admin" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'annonces' AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND actif = TRUE));
CREATE POLICY "annonce_files_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'annonces' AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND actif = TRUE)
    OR EXISTS (SELECT 1 FROM public.lab_annonces WHERE attachment_path = storage.objects.name)
  ));

CREATE TABLE public.notification_email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('chat','annonce')),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  annonce_id UUID REFERENCES public.lab_annonces(id) ON DELETE CASCADE,
  queued_through TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','skipped','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_id UUID,
  lease_until TIMESTAMPTZ,
  provider_id TEXT,
  last_error TEXT,
  CHECK ((kind = 'chat' AND conversation_id IS NOT NULL AND annonce_id IS NULL)
    OR (kind = 'annonce' AND annonce_id IS NOT NULL AND conversation_id IS NULL)),
  UNIQUE (annonce_id, recipient_id)
);
ALTER TABLE public.notification_email_jobs ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX pending_chat_email ON public.notification_email_jobs (conversation_id, recipient_id)
  WHERE kind = 'chat' AND status = 'pending' AND attempts = 0;
CREATE INDEX email_jobs_ready ON public.notification_email_jobs (ready_at) WHERE status IN ('pending','processing');

CREATE FUNCTION public.queue_unread_chat_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_email_jobs (kind, recipient_id, conversation_id, queued_through, ready_at)
  SELECT 'chat', profile.id, NEW.conversation_id, NEW.created_at, NEW.created_at + interval '5 minutes'
  FROM public.profiles profile
  JOIN public.conversations conversation ON conversation.id = NEW.conversation_id
  LEFT JOIN public.notification_preferences preference ON preference.user_id = profile.id
  WHERE profile.id <> NEW.auteur_id AND profile.actif = TRUE AND profile.statut_compte = 'approuve'
    AND coalesce(preference.email_message, TRUE) AND (
      (conversation.dentiste_id IS NOT NULL AND (profile.id = conversation.dentiste_id OR public.is_active_lab_member(profile.id)))
      OR (conversation.dentiste_id IS NULL AND public.is_active_lab_member(profile.id) AND profile.id IN (conversation.private_user_low, conversation.private_user_high))
    )
  ON CONFLICT (conversation_id, recipient_id) WHERE kind = 'chat' AND status = 'pending' AND attempts = 0
  DO UPDATE SET queued_through = greatest(notification_email_jobs.queued_through, EXCLUDED.queued_through);
  RETURN NEW;
END;
$$;
CREATE TRIGGER queue_unread_chat_email AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.queue_unread_chat_email();

CREATE FUNCTION public.notification_email_payload(p_job_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  job public.notification_email_jobs;
  recipient public.profiles;
  preference public.notification_preferences;
  conversation public.conversations;
  announcement public.lab_annonces;
  sender_name TEXT;
  last_read TIMESTAMPTZ;
  path TEXT;
BEGIN
  SELECT * INTO job FROM public.notification_email_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO recipient FROM public.profiles WHERE id = job.recipient_id;
  IF NOT recipient.actif OR recipient.statut_compte <> 'approuve' OR recipient.email IS NULL
    OR (recipient.role = 'technicien' AND NOT recipient.actif_collaborateur) THEN RETURN NULL; END IF;
  SELECT * INTO preference FROM public.notification_preferences WHERE user_id = recipient.id;
  path := CASE recipient.role WHEN 'admin' THEN '/admin' WHEN 'technicien' THEN '/atelier' ELSE '/dashboard' END;
  IF job.kind = 'chat' THEN
    IF NOT coalesce(preference.email_message, TRUE) THEN RETURN NULL; END IF;
    SELECT * INTO conversation FROM public.conversations WHERE id = job.conversation_id;
    IF NOT ((conversation.dentiste_id IS NOT NULL AND (recipient.id = conversation.dentiste_id OR public.is_active_lab_member(recipient.id)))
      OR (conversation.dentiste_id IS NULL AND public.is_active_lab_member(recipient.id) AND recipient.id IN (conversation.private_user_low, conversation.private_user_high))) THEN RETURN NULL; END IF;
    SELECT last_read_at INTO last_read FROM public.conversation_participants WHERE conversation_id = conversation.id AND user_id = recipient.id;
    SELECT concat_ws(' ', profile.prenom, profile.nom) INTO sender_name
    FROM public.messages message JOIN public.profiles profile ON profile.id = message.auteur_id
    WHERE message.conversation_id = conversation.id AND message.auteur_id <> recipient.id AND message.deleted_at IS NULL
      AND message.created_at > coalesce(last_read, '-infinity'::TIMESTAMPTZ) AND message.created_at <= job.queued_through
    ORDER BY message.created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN jsonb_build_object('kind','chat','email',recipient.email,'user_id',recipient.id,
      'title','Messages non lus','message',concat(sender_name,' vous a écrit sur DECERF LAB.'),'path',path || '/messages');
  END IF;
  SELECT * INTO announcement FROM public.lab_annonces WHERE id = job.annonce_id;
  IF recipient.role <> 'dentiste' OR announcement.statut <> 'publie' OR announcement.starts_at > now()
    OR (announcement.ends_at IS NOT NULL AND announcement.ends_at <= now()) OR NOT announcement.send_email
    OR EXISTS (SELECT 1 FROM public.lab_annonce_reads WHERE annonce_id = announcement.id AND user_id = recipient.id)
    OR (announcement.categorie = 'promotion' AND NOT coalesce(preference.email_promotion, FALSE))
    OR (announcement.categorie <> 'promotion' AND NOT coalesce(preference.email_annonce, TRUE)) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('kind','annonce','email',recipient.email,'user_id',recipient.id,
    'title',announcement.titre,'message',announcement.message,'path','/dashboard/annonces',
    'attachment_path',announcement.attachment_path,'attachment_name',announcement.attachment_name);
END;
$$;

CREATE FUNCTION public.claim_notification_emails(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.notification_email_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.notification_email_jobs (kind,recipient_id,annonce_id)
  SELECT 'annonce', profile.id, announcement.id FROM public.lab_annonces announcement
  CROSS JOIN public.profiles profile
  WHERE announcement.statut = 'publie' AND announcement.starts_at <= now() AND announcement.send_email
    AND (announcement.ends_at IS NULL OR announcement.ends_at > now())
    AND profile.role = 'dentiste' AND profile.actif AND profile.statut_compte = 'approuve'
  ON CONFLICT (annonce_id,recipient_id) DO NOTHING;
  UPDATE public.notification_email_jobs SET status = 'skipped'
  WHERE status = 'pending' AND ready_at <= now() AND public.notification_email_payload(id) IS NULL;
  RETURN QUERY WITH selected AS (
    SELECT id FROM public.notification_email_jobs WHERE ready_at <= now()
      AND (status = 'pending' OR (status = 'processing' AND lease_until < now())) AND attempts < 5
    ORDER BY ready_at LIMIT least(greatest(p_limit,1),50) FOR UPDATE SKIP LOCKED
  ) UPDATE public.notification_email_jobs job SET status = 'processing', attempts = attempts + 1,
      lease_id = gen_random_uuid(), lease_until = now() + interval '5 minutes'
    FROM selected WHERE job.id = selected.id RETURNING job.*;
END;
$$;

CREATE FUNCTION public.finish_notification_email(p_job_id UUID, p_lease_id UUID, p_provider_id TEXT DEFAULT NULL, p_error TEXT DEFAULT NULL, p_skipped BOOLEAN DEFAULT FALSE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.notification_email_jobs
  SET status = CASE WHEN p_skipped THEN 'skipped' WHEN p_error IS NULL THEN 'sent' WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
      provider_id = p_provider_id, last_error = p_error, ready_at = now() + interval '1 minute' * attempts,
      lease_until = NULL
  WHERE id = p_job_id AND lease_id = p_lease_id AND status = 'processing';
END;
$$;
REVOKE ALL ON FUNCTION public.notification_email_payload(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_notification_emails(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_notification_email(UUID, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notification_email_payload(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_emails(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_notification_email(UUID, UUID, TEXT, TEXT, BOOLEAN) TO service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_annonces, public.lab_annonce_reads;
  END IF;
END; $$;
COMMIT;