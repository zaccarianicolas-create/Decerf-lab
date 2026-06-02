-- Step 14: Branding & paramétrage labo enrichi
alter table public.parametres_labo
  add column if not exists nom_labo text not null default 'DECERF LAB',
  add column if not exists adresse text,
  add column if not exists code_postal text,
  add column if not exists ville text,
  add column if not exists pays text default 'Belgique',
  add column if not exists telephone text,
  add column if not exists email_contact text,
  add column if not exists site_web text,
  add column if not exists tva_numero text,
  add column if not exists numero_agrement text,
  add column if not exists iban text,
  add column if not exists bic text,
  add column if not exists logo_url text,
  add column if not exists signature_url text,
  add column if not exists couleur_primaire text default '#0284c7',
  add column if not exists taux_tva_defaut numeric(5,2) default 21.00,
  add column if not exists mentions_legales_facture text,
  add column if not exists mentions_legales_certificat text,
  add column if not exists conditions_paiement text default 'Paiement à 30 jours',
  add column if not exists horaires text,
  add column if not exists prefixe_facture text default 'FA',
  add column if not exists prefixe_certificat text default 'CC',
  add column if not exists prefixe_devis text default 'DV';

-- Bucket public pour logo / signature
do $$ begin
  insert into storage.buckets (id, name, public)
  values ('branding', 'branding', true)
  on conflict (id) do nothing;
exception when others then null; end $$;

do $$ begin
  drop policy if exists "branding_public_read" on storage.objects;
  drop policy if exists "branding_admin_write" on storage.objects;
exception when others then null; end $$;

create policy "branding_public_read" on storage.objects
  for select using (bucket_id = 'branding');

create policy "branding_admin_write" on storage.objects
  for all using (
    bucket_id = 'branding'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    bucket_id = 'branding'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
