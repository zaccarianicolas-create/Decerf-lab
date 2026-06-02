-- Step 10 : Collaborateurs (techniciens) + assignations + tâches
-- Additive, idempotent.

-- =============================================
-- 1. Étendre user_role avec 'technicien'
-- =============================================
do $$ begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'user_role' and e.enumlabel = 'technicien'
  ) then
    alter type user_role add value 'technicien';
  end if;
end $$;

-- =============================================
-- 2. Métadonnées collaborateur sur profiles
-- =============================================
alter table public.profiles
  add column if not exists role_labo text,
  add column if not exists actif_collaborateur boolean not null default true;

create index if not exists profiles_role_labo_idx on public.profiles (role_labo);

-- =============================================
-- 3. Assignations commande <-> technicien
-- =============================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'assignation_role') then
    create type assignation_role as enum ('responsable', 'aide', 'qualite', 'finition');
  end if;
end $$;

create table if not exists public.commande_assignations (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes(id) on delete cascade,
  technicien_id uuid not null references public.profiles(id) on delete cascade,
  role assignation_role not null default 'responsable',
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  unique (commande_id, technicien_id, role)
);

create index if not exists commande_assignations_commande_idx on public.commande_assignations (commande_id);
create index if not exists commande_assignations_tech_idx on public.commande_assignations (technicien_id);

alter table public.commande_assignations enable row level security;

drop policy if exists "assignations_select" on public.commande_assignations;
create policy "assignations_select"
  on public.commande_assignations for select
  using (
    technicien_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or exists (
      select 1 from public.commandes c
      where c.id = commande_id and c.dentiste_id = auth.uid()
    )
  );

drop policy if exists "assignations_admin_all" on public.commande_assignations;
create policy "assignations_admin_all"
  on public.commande_assignations for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- 4. Tâches internes
-- =============================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'tache_statut') then
    create type tache_statut as enum ('a_faire', 'en_cours', 'fait', 'bloque');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'tache_priorite') then
    create type tache_priorite as enum ('basse', 'normale', 'haute', 'urgente');
  end if;
end $$;

create table if not exists public.commande_taches (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references public.commandes(id) on delete cascade,
  titre text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete set null,
  statut tache_statut not null default 'a_faire',
  priorite tache_priorite not null default 'normale',
  due_date date,
  done_at timestamptz,
  done_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists commande_taches_commande_idx on public.commande_taches (commande_id);
create index if not exists commande_taches_assignee_idx on public.commande_taches (assignee_id);
create index if not exists commande_taches_statut_idx on public.commande_taches (statut);

alter table public.commande_taches enable row level security;

drop policy if exists "taches_select" on public.commande_taches;
create policy "taches_select"
  on public.commande_taches for select
  using (
    assignee_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
      select 1 from public.commande_assignations a
      where a.commande_id = commande_taches.commande_id and a.technicien_id = auth.uid()
    )
  );

drop policy if exists "taches_admin_all" on public.commande_taches;
create policy "taches_admin_all"
  on public.commande_taches for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Le technicien peut UPDATE le statut/done_at d'une tâche qui lui est assignée
drop policy if exists "taches_assignee_update" on public.commande_taches;
create policy "taches_assignee_update"
  on public.commande_taches for update
  using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

-- updated_at trigger
create or replace function public.set_commande_taches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_commande_taches_updated_at on public.commande_taches;
create trigger trg_commande_taches_updated_at
  before update on public.commande_taches
  for each row execute function public.set_commande_taches_updated_at();

-- =============================================
-- 5. Realtime
-- =============================================
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'commande_assignations'
  ) then
    alter publication supabase_realtime add table public.commande_assignations;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'commande_taches'
  ) then
    alter publication supabase_realtime add table public.commande_taches;
  end if;
end $$;
