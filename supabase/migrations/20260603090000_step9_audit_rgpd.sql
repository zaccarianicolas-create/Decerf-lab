-- Step 9 : Audit logs + RGPD requests
-- Additive, idempotent migration

-- =============================================
-- Audit logs
-- =============================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Pas d'INSERT/UPDATE/DELETE via clients: écriture uniquement par service role.

-- =============================================
-- RGPD requests
-- =============================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'rgpd_request_type') then
    create type rgpd_request_type as enum ('export', 'suppression', 'rectification');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'rgpd_request_statut') then
    create type rgpd_request_statut as enum ('demande', 'en_cours', 'traite', 'refuse');
  end if;
end $$;

create table if not exists public.rgpd_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type rgpd_request_type not null,
  statut rgpd_request_statut not null default 'demande',
  message text,
  reponse text,
  traite_at timestamptz,
  traite_par uuid references public.profiles(id) on delete set null
);

create index if not exists rgpd_requests_user_idx on public.rgpd_requests (user_id);
create index if not exists rgpd_requests_statut_idx on public.rgpd_requests (statut);

alter table public.rgpd_requests enable row level security;

drop policy if exists "rgpd_requests_owner_select" on public.rgpd_requests;
create policy "rgpd_requests_owner_select"
  on public.rgpd_requests for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "rgpd_requests_owner_insert" on public.rgpd_requests;
create policy "rgpd_requests_owner_insert"
  on public.rgpd_requests for insert
  with check (user_id = auth.uid());

drop policy if exists "rgpd_requests_admin_update" on public.rgpd_requests;
create policy "rgpd_requests_admin_update"
  on public.rgpd_requests for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rgpd_requests'
  ) then
    alter publication supabase_realtime add table public.rgpd_requests;
  end if;
end $$;
