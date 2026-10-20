BEGIN;

UPDATE public.partenaires
SET logo_path = '/images/lexeragroup-logo.png',
    updated_at = now()
WHERE slug = 'lexeragroup'
  AND logo_path IS NULL;

COMMIT;