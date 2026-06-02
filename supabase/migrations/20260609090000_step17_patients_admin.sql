-- ============================================
-- Step 17 — Section Patients côté Admin
-- - Permet aux patients d'être "orphelins" (sans dentiste référent)
-- - Réassignation possible depuis l'admin
-- ============================================

alter table public.patients
  alter column dentiste_id drop not null;

create index if not exists patients_actif_idx on public.patients(actif);
create index if not exists patients_archived_idx on public.patients(archived_at);

-- Politique admin pour update / insert (lecture déjà couverte ailleurs, mais on s'assure)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patients'
      and policyname = 'patients_admin_all'
  ) then
    create policy "patients_admin_all" on public.patients
      for all
      to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_notes_cliniques'
      and policyname = 'patient_notes_admin_all'
  ) then
    create policy "patient_notes_admin_all" on public.patient_notes_cliniques
      for all
      to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;
