BEGIN;

DROP POLICY IF EXISTS certificats_pdf_read_owner ON storage.objects;
CREATE POLICY certificats_pdf_read_owner
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certificats'
    AND (
      EXISTS (
        SELECT 1 FROM public.certificats_conformite certificat
        WHERE certificat.pdf_storage_bucket = 'certificats'
          AND certificat.pdf_storage_path = storage.objects.name
          AND certificat.dentiste_id = auth.uid()
          AND certificat.statut = 'envoye'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

COMMIT;