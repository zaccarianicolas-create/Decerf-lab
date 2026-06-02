-- ============================================
-- DECERF LAB - Etape 2: onboarding complet
-- Inscription site + invitation labo
-- ============================================

-- ============================================
-- ENUM type de compte client
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_compte_client') THEN
    CREATE TYPE type_compte_client AS ENUM (
      'dentiste_independant',
      'clinique'
    );
  END IF;
END
$$;

-- ============================================
-- Enrichissement profils/cabinets/invitations
-- ============================================
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS type_compte_client type_compte_client NOT NULL DEFAULT 'dentiste_independant';

ALTER TABLE cabinets
  ADD COLUMN IF NOT EXISTS onboarding_source onboarding_channel DEFAULT 'inscription_site';

ALTER TABLE invitations_inscription
  ADD COLUMN IF NOT EXISTS telephone TEXT;

ALTER TABLE invitations_inscription
  ADD COLUMN IF NOT EXISTS cabinet_nom TEXT;

ALTER TABLE invitations_inscription
  ADD COLUMN IF NOT EXISTS type_compte_client type_compte_client NOT NULL DEFAULT 'dentiste_independant';

CREATE INDEX IF NOT EXISTS idx_profiles_type_compte_client ON profiles(type_compte_client);

-- ============================================
-- Refonte de handle_new_user avec gestion invitation
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role := 'dentiste';
  _statut statut_compte := 'en_attente';
  _source onboarding_channel := 'inscription_site';
  _telephone TEXT;
  _cabinet_nom TEXT;
  _type_compte type_compte_client := 'dentiste_independant';
  _invitation_token TEXT;
  _cabinet_id UUID;
  _valide_par UUID;
  _date_validation TIMESTAMPTZ;
  _invitation invitations_inscription%ROWTYPE;
BEGIN
  -- Metadonnees de base
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    BEGIN
      _role := (NEW.raw_user_meta_data->>'role')::user_role;
    EXCEPTION WHEN OTHERS THEN
      _role := 'dentiste';
    END;
  END IF;

  IF NEW.raw_user_meta_data->>'onboarding_source' IS NOT NULL THEN
    BEGIN
      _source := (NEW.raw_user_meta_data->>'onboarding_source')::onboarding_channel;
    EXCEPTION WHEN OTHERS THEN
      _source := 'inscription_site';
    END;
  END IF;

  IF NEW.raw_user_meta_data->>'type_compte_client' IS NOT NULL THEN
    BEGIN
      _type_compte := (NEW.raw_user_meta_data->>'type_compte_client')::type_compte_client;
    EXCEPTION WHEN OTHERS THEN
      _type_compte := 'dentiste_independant';
    END;
  END IF;

  _telephone := NULLIF(NEW.raw_user_meta_data->>'telephone', '');
  _cabinet_nom := NULLIF(NEW.raw_user_meta_data->>'cabinet_nom', '');
  _invitation_token := NULLIF(NEW.raw_user_meta_data->>'invitation_token', '');

  -- Admin = approuve automatiquement
  IF _role = 'admin' THEN
    _statut := 'approuve';
    _date_validation := now();
  END IF;

  -- Si inscription via invitation labo valide => approuve auto
  IF _invitation_token IS NOT NULL THEN
    SELECT *
    INTO _invitation
    FROM invitations_inscription
    WHERE token = _invitation_token
      AND lower(email) = lower(NEW.email)
      AND expire_at > now()
      AND accepte_at IS NULL
      AND annule_at IS NULL
    LIMIT 1;

    IF FOUND THEN
      _statut := 'approuve';
      _source := 'invitation_labo';
      _cabinet_id := _invitation.cabinet_id;
      _valide_par := _invitation.created_by;
      _date_validation := now();

      IF _invitation.type_compte_client IS NOT NULL THEN
        _type_compte := _invitation.type_compte_client;
      END IF;

      IF _telephone IS NULL THEN
        _telephone := _invitation.telephone;
      END IF;

      IF _cabinet_nom IS NULL THEN
        _cabinet_nom := _invitation.cabinet_nom;
      END IF;
    END IF;
  END IF;

  -- Trouver/creer cabinet si necessaire
  IF _cabinet_id IS NULL AND _cabinet_nom IS NOT NULL THEN
    SELECT id INTO _cabinet_id
    FROM cabinets
    WHERE lower(nom) = lower(_cabinet_nom)
    LIMIT 1;

    IF _cabinet_id IS NULL THEN
      INSERT INTO cabinets (nom, onboarding_source)
      VALUES (_cabinet_nom, _source)
      RETURNING id INTO _cabinet_id;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    nom,
    prenom,
    telephone,
    role,
    cabinet_id,
    type_compte_client,
    onboarding_source,
    statut_compte,
    actif,
    valide_par,
    date_validation
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    _telephone,
    _role,
    _cabinet_id,
    _type_compte,
    _source,
    _statut,
    (_statut = 'approuve' OR _role = 'admin'),
    _valide_par,
    _date_validation
  );

  -- Marquer l'invitation comme acceptee
  IF _invitation_token IS NOT NULL THEN
    UPDATE invitations_inscription
    SET accepte_at = now()
    WHERE token = _invitation_token
      AND lower(email) = lower(NEW.email)
      AND accepte_at IS NULL
      AND annule_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
