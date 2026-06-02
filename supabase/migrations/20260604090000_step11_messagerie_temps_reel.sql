-- Step 11 : Messagerie temps réel complète
-- Pièces jointes, réactions, réponses, édition, multi-participants
-- Additive et idempotent.

-- =============================================
-- 1. Étendre la table messages
-- =============================================
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists message_type text not null default 'text',
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size integer,
  add column if not exists attachment_bucket text,
  add column if not exists attachment_path text;

create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index if not exists messages_reply_idx on public.messages (reply_to_id);

-- Permettre `contenu` vide pour les messages fichier-uniquement
do $$ begin
  begin
    alter table public.messages alter column contenu drop not null;
  exception when others then null;
  end;
end $$;

-- =============================================
-- 2. Participants multiples par conversation
-- =============================================
create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'membre',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create index if not exists conv_participants_conv_idx on public.conversation_participants (conversation_id);
create index if not exists conv_participants_user_idx on public.conversation_participants (user_id);

alter table public.conversation_participants enable row level security;

drop policy if exists "conv_participants_select" on public.conversation_participants;
create policy "conv_participants_select"
  on public.conversation_participants for select
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
      select 1 from public.conversation_participants p2
      where p2.conversation_id = conversation_participants.conversation_id
        and p2.user_id = auth.uid()
    )
  );

drop policy if exists "conv_participants_admin_all" on public.conversation_participants;
create policy "conv_participants_admin_all"
  on public.conversation_participants for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =============================================
-- 3. Réactions (emoji)
-- =============================================
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_msg_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

drop policy if exists "reactions_select" on public.message_reactions;
create policy "reactions_select"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_reactions.message_id
        and (
          c.dentiste_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "reactions_insert_own" on public.message_reactions;
create policy "reactions_insert_own"
  on public.message_reactions for insert
  with check (user_id = auth.uid());

drop policy if exists "reactions_delete_own" on public.message_reactions;
create policy "reactions_delete_own"
  on public.message_reactions for delete
  using (user_id = auth.uid());

-- =============================================
-- 4. Mise à jour RLS conversations / messages pour participants
-- =============================================

-- Conversations : autoriser un participant à voir
drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
  on public.conversations for select
  using (
    dentiste_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

-- Messages : élargir le select aux participants
drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.dentiste_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );

-- Messages : insertion par participant / dentiste / admin
drop policy if exists "messages_insert_participants" on public.messages;
create policy "messages_insert_participants"
  on public.messages for insert
  with check (
    auteur_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          c.dentiste_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
          or exists (
            select 1 from public.conversation_participants cp
            where cp.conversation_id = c.id and cp.user_id = auth.uid()
          )
        )
    )
  );

-- Update / soft delete : auteur ou admin
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages for update
  using (
    auteur_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    auteur_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================
-- 5. Bucket Storage "messages"
-- =============================================
do $$ begin
  insert into storage.buckets (id, name, public)
  values ('messages', 'messages', false)
  on conflict (id) do nothing;
end $$;

drop policy if exists "messages_storage_read" on storage.objects;
create policy "messages_storage_read"
  on storage.objects for select
  using (
    bucket_id = 'messages'
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      or exists (
        select 1 from public.messages m
        join public.conversations c on c.id = m.conversation_id
        where m.attachment_path = storage.objects.name
          and (
            c.dentiste_id = auth.uid()
            or exists (
              select 1 from public.conversation_participants cp
              where cp.conversation_id = c.id and cp.user_id = auth.uid()
            )
          )
      )
    )
  );

drop policy if exists "messages_storage_insert" on storage.objects;
create policy "messages_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'messages'
    and auth.uid() is not null
  );

-- =============================================
-- 6. Trigger : mettre à jour derniere_activite
-- =============================================
create or replace function public.touch_conversation_on_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
  set derniere_activite = now()
  where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- =============================================
-- 7. Realtime
-- =============================================
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
