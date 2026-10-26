DROP POLICY IF EXISTS service_tarifs_dentist_read_active ON public.service_tarifs;
CREATE POLICY service_tarifs_dentist_read_active
  ON public.service_tarifs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'dentiste')
    )
    AND EXISTS (
      SELECT 1
      FROM public.services_labo s
      WHERE s.id = service_tarifs.service_id
        AND s.actif = true
    )
  );

DROP POLICY IF EXISTS service_options_dentist_read_active ON public.service_options;
CREATE POLICY service_options_dentist_read_active
  ON public.service_options FOR SELECT TO authenticated
  USING (
    actif = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'dentiste')
    )
    AND EXISTS (
      SELECT 1
      FROM public.services_labo s
      WHERE s.id = service_options.service_id
        AND s.actif = true
    )
  );
