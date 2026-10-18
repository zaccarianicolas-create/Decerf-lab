BEGIN;

UPDATE public.certificat_modeles
SET contenu_template = replace(
  contenu_template,
  'Établissement prescripteur : {{dentiste.cabinet}}',
  'Établissement prescripteur : {{dentiste.cabinet}}' || E'\nAdresse du prescripteur : {{dentiste.adresse}}'
),
  version = version + 1,
  updated_at = now()
WHERE code = 'annexe-xiii-default'
  AND position('{{dentiste.adresse}}' IN contenu_template) = 0;

COMMIT;