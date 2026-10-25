UPDATE public.parametres_labo
SET nom_labo = CASE
      WHEN nom_labo IS NULL OR upper(nom_labo) = 'DECERF LAB' THEN 'Decerf lab'
      ELSE nom_labo
    END,
    adresse = COALESCE(NULLIF(btrim(adresse), ''), 'Rue des Claveaux 1'),
    code_postal = COALESCE(NULLIF(btrim(code_postal), ''), '4560'),
    ville = COALESCE(NULLIF(btrim(ville), ''), 'Clavier'),
    pays = COALESCE(NULLIF(btrim(pays), ''), 'Belgique'),
    email_contact = COALESCE(NULLIF(btrim(email_contact), ''), 'contact@decerf-lab.be'),
    site_web = COALESCE(NULLIF(btrim(site_web), ''), 'https://www.decerf-lab.be')
WHERE singleton_key = true;
