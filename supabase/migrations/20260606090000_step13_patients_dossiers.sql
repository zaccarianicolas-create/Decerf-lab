-- Step 13: Patients & dossiers cliniques étendus
-- Champs cliniques + notes datées + archivage/anonymisation

alter table public.patients
  add column if not exists telephone text,
  add column if not exists email text,
  add column if not exists allergies text,
  add column if not exists antecedents text,
  add column if not exists traitements_en_cours text,
  add column if not exists contre_indications text,
  add column if not exists medecin_traitant text,
  add column if not exists archived_at timestamptz,
  add column if not exists anonymized_at timestamptz;

create table if not exists public.patient_notes_cliniques (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  dentiste_id uuid not null references public.profiles(id) on delete set null,
  date_note date not null default current_date,
  titre text,
  contenu text not null,
  type text not null default 'observation', -- observation | examen | prescription | suivi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patient_notes_patient_idx
  on public.patient_notes_cliniques(patient_id, date_note desc);

alter table public.patient_notes_cliniques enable row level security;

do $$ begin
  drop policy if exists "patient_notes_owner_all" on public.patient_notes_cliniques;
  drop policy if exists "patient_notes_admin_select" on public.patient_notes_cliniques;
exception when others then null; end $$;

create policy "patient_notes_owner_all" on public.patient_notes_cliniques
  for all using (
    exists (
      select 1 from public.patients p
      where p.id = patient_id and p.dentiste_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.patients p
      where p.id = patient_id and p.dentiste_id = auth.uid()
    )
  );

create policy "patient_notes_admin_select" on public.patient_notes_cliniques
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create trigger patient_notes_updated_at
  before update on public.patient_notes_cliniques
  for each row execute function update_updated_at();
