-- Step 16: Clients sans compte (gérés par le labo)
-- Permet de créer des "dentistes/cliniques" sans utilisateur auth.users
-- pour facturer/produire des travaux pour des praticiens non-tech.

-- 1) Relâcher la FK vers auth.users (la garder informellement via trigger n'est pas nécessaire)
do $$
declare
  c_name text;
begin
  select tc.constraint_name into c_name
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name = 'profiles'
    and tc.constraint_type = 'FOREIGN KEY';
  if c_name is not null then
    execute format('alter table public.profiles drop constraint if exists %I', c_name);
  end if;
exception when others then null;
end $$;

-- Cas le plus courant
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- 2) Champs pour piloter ce mode
alter table public.profiles
  add column if not exists sans_compte boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 3) Email nullable pour ce mode (un dentiste "papier" peut n'avoir qu'un téléphone)
do $$ begin
  alter table public.profiles alter column email drop not null;
exception when others then null; end $$;

-- 4) Index utilitaires
create index if not exists profiles_sans_compte_idx on public.profiles(sans_compte);

-- 5) Cleanup trigger handle_new_user (laisser tel quel : il ne crée que pour les vrais auth.users)

-- 6) Politique : un client sans compte ne se connecte jamais → pas de policy supplémentaire requise.
--    L'admin reste seul à voir/éditer ces profils via les policies admin existantes.
