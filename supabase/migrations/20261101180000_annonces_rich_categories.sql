BEGIN;
CREATE TABLE public.lab_annonce_categories (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  email_kind TEXT NOT NULL CHECK (email_kind IN ('information','promotion')),
  is_closure BOOLEAN NOT NULL DEFAULT FALSE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.lab_annonce_categories (code,label,email_kind,is_closure) VALUES
  ('information','Information','information',FALSE),('fermeture','Congés / fermeture','information',TRUE),
  ('voeux','Vœux','information',FALSE),('promotion','Offre commerciale','promotion',FALSE);
ALTER TABLE public.lab_annonce_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_read ON public.lab_annonce_categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY categories_admin ON public.lab_annonce_categories FOR ALL TO authenticated
  USING (public.is_active_lab_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'))
  WITH CHECK (public.is_active_lab_member(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin'));
ALTER TABLE public.lab_annonces DROP CONSTRAINT lab_annonces_categorie_check,
  ADD CONSTRAINT lab_annonces_category_fk FOREIGN KEY (categorie) REFERENCES public.lab_annonce_categories(code),
  ADD COLUMN message_document JSONB,
  ADD COLUMN image_paths TEXT[] NOT NULL DEFAULT '{}';
CREATE FUNCTION public.set_annonce_image_paths()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  NEW.image_paths := ARRAY(SELECT DISTINCT value #>> '{}' FROM jsonb_path_query(coalesce(NEW.message_document,'{}'), '$.**.storagePath') value);
  RETURN NEW;
END; $$;
CREATE TRIGGER annonce_image_paths BEFORE INSERT OR UPDATE ON public.lab_annonces
  FOR EACH ROW EXECUTE FUNCTION public.set_annonce_image_paths();
DROP POLICY annonce_files_read ON storage.objects;
CREATE POLICY annonce_files_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='annonces' AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND actif=TRUE)
    OR EXISTS (SELECT 1 FROM public.lab_annonces WHERE attachment_path=storage.objects.name OR storage.objects.name=ANY(image_paths))
  ));

CREATE OR REPLACE FUNCTION public.notification_email_payload(p_job_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  job public.notification_email_jobs;
  recipient public.profiles;
  preference public.notification_preferences;
  conversation public.conversations;
  announcement public.lab_annonces;
  category public.lab_annonce_categories;
  sender_name TEXT;
  last_read TIMESTAMPTZ;
  path TEXT;
BEGIN
  SELECT * INTO job FROM public.notification_email_jobs WHERE id=p_job_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO recipient FROM public.profiles WHERE id=job.recipient_id;
  IF NOT recipient.actif OR recipient.statut_compte <> 'approuve' OR recipient.email IS NULL
    OR (recipient.role='technicien' AND NOT recipient.actif_collaborateur) THEN RETURN NULL; END IF;
  SELECT * INTO preference FROM public.notification_preferences WHERE user_id=recipient.id;
  path := CASE recipient.role WHEN 'admin' THEN '/admin' WHEN 'technicien' THEN '/atelier' ELSE '/dashboard' END;
  IF job.kind='chat' THEN
    IF NOT coalesce(preference.email_message,TRUE) THEN RETURN NULL; END IF;
    SELECT * INTO conversation FROM public.conversations WHERE id=job.conversation_id;
    IF NOT ((conversation.dentiste_id IS NOT NULL AND (recipient.id=conversation.dentiste_id OR public.is_active_lab_member(recipient.id)))
      OR (conversation.dentiste_id IS NULL AND public.is_active_lab_member(recipient.id) AND recipient.id IN (conversation.private_user_low,conversation.private_user_high))) THEN RETURN NULL; END IF;
    SELECT last_read_at INTO last_read FROM public.conversation_participants WHERE conversation_id=conversation.id AND user_id=recipient.id;
    SELECT concat_ws(' ',profile.prenom,profile.nom) INTO sender_name FROM public.messages message JOIN public.profiles profile ON profile.id=message.auteur_id
    WHERE message.conversation_id=conversation.id AND message.auteur_id<>recipient.id AND message.deleted_at IS NULL
      AND message.created_at>coalesce(last_read,'-infinity'::TIMESTAMPTZ) AND message.created_at<=job.queued_through
    ORDER BY message.created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN jsonb_build_object('kind','chat','email',recipient.email,'user_id',recipient.id,'title','Messages non lus',
      'message',concat(sender_name,' vous a écrit sur DECERF LAB.'),'path',path || '/messages');
  END IF;
  SELECT * INTO announcement FROM public.lab_annonces WHERE id=job.annonce_id;
  SELECT * INTO category FROM public.lab_annonce_categories WHERE code=announcement.categorie;
  IF recipient.role<>'dentiste' OR announcement.statut<>'publie' OR announcement.starts_at>now()
    OR (announcement.ends_at IS NOT NULL AND announcement.ends_at<=now()) OR NOT announcement.send_email
    OR EXISTS (SELECT 1 FROM public.lab_annonce_reads WHERE annonce_id=announcement.id AND user_id=recipient.id)
    OR (category.email_kind='promotion' AND NOT coalesce(preference.email_promotion,FALSE))
    OR (category.email_kind<>'promotion' AND NOT coalesce(preference.email_annonce,TRUE)) THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('kind','annonce','email',recipient.email,'user_id',recipient.id,'title',announcement.titre,
    'message',announcement.message,'message_document',announcement.message_document,'image_paths',announcement.image_paths,
    'path','/dashboard/annonces','attachment_path',announcement.attachment_path,'attachment_name',announcement.attachment_name);
END; $$;
COMMIT;