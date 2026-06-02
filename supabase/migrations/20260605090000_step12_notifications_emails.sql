-- Step 12: Notifications & emails transactionnels
-- Préférences email par utilisateur + log des emails envoyés (idempotent)

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_invitation boolean not null default true,
  email_certificat boolean not null default true,
  email_facture boolean not null default true,
  email_commande boolean not null default true,
  email_message boolean not null default true,
  email_assignation boolean not null default true,
  email_rgpd boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

do $$ begin
  drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
  drop policy if exists "notif_prefs_upsert_own" on public.notification_preferences;
  drop policy if exists "notif_prefs_update_own" on public.notification_preferences;
  drop policy if exists "notif_prefs_admin_all" on public.notification_preferences;
exception when others then null; end $$;

create policy "notif_prefs_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);
create policy "notif_prefs_upsert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);
create policy "notif_prefs_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id);
create policy "notif_prefs_admin_all" on public.notification_preferences
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Journal des emails envoyés
create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  to_user_id uuid references public.profiles(id) on delete set null,
  template text not null,
  subject text not null,
  status text not null default 'sent', -- sent | error | skipped
  provider_id text,
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists email_log_user_idx on public.email_log(to_user_id, created_at desc);
create index if not exists email_log_template_idx on public.email_log(template, created_at desc);

alter table public.email_log enable row level security;

do $$ begin
  drop policy if exists "email_log_admin_only" on public.email_log;
exception when others then null; end $$;

create policy "email_log_admin_only" on public.email_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
