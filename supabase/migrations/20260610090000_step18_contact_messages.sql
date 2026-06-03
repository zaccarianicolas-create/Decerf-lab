-- Step 18 — Formulaire de contact public
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null,
  telephone text,
  sujet text,
  message text not null,
  ip text,
  user_agent text,
  traite boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx
  on public.contact_messages(created_at desc);

alter table public.contact_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_messages'
      and policyname = 'contact_admin_all'
  ) then
    create policy "contact_admin_all" on public.contact_messages
      for all to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end$$;
