-- Step 19 — Protocoles V2: templates configurables + instances liées aux travaux/clients

alter table public.protocoles
  add column if not exists type_protocole text not null default 'fabrication',
  add column if not exists type_travail text,
  add column if not exists version integer not null default 1,
  add column if not exists template_sections jsonb not null default
    '{"entete":true,"contexte":true,"checklist":true,"materiaux":true,"tracabilite":true,"notes":true,"signature":true}'::jsonb;

create table if not exists public.protocole_instances (
  id uuid primary key default gen_random_uuid(),
  protocole_id uuid not null references public.protocoles(id) on delete restrict,
  commande_id uuid references public.commandes(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  dentiste_id uuid references public.profiles(id) on delete set null,
  titre text not null,
  type_protocole text not null default 'fabrication',
  type_travail text,
  version integer not null default 1,
  statut text not null default 'brouillon',
  sections jsonb not null default '{}'::jsonb,
  template_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists protocole_instances_commande_idx on public.protocole_instances(commande_id, created_at desc);
create index if not exists protocole_instances_patient_idx on public.protocole_instances(patient_id, created_at desc);
create index if not exists protocole_instances_dentiste_idx on public.protocole_instances(dentiste_id, created_at desc);

create trigger tr_protocole_instances_updated_at
  before update on public.protocole_instances
  for each row execute function update_updated_at();

alter table public.protocole_instances enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'protocole_instances'
      and policyname = 'protocole_instances_admin_all'
  ) then
    create policy "protocole_instances_admin_all"
      on public.protocole_instances
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

-- Les dentistes ne voient que les protocoles instanciés qui leur appartiennent
-- (utile si on veut les exposer plus tard côté dashboard)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'protocole_instances'
      and policyname = 'protocole_instances_dentiste_select'
  ) then
    create policy "protocole_instances_dentiste_select"
      on public.protocole_instances
      for select
      to authenticated
      using (dentiste_id = auth.uid());
  end if;
end$$;