-- ============================================
-- DECERF LAB - Etape 1: socle donnees
-- Ajouts additifs uniquement (sans casser l'existant)
-- ============================================

-- ============================================
-- ENUMS (idempotent)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'facture_statut') THEN
    CREATE TYPE facture_statut AS ENUM (
      'brouillon',
      'emise',
      'envoyee',
      'partiellement_payee',
      'payee',
      'en_retard',
      'annulee'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'avoir_statut') THEN
    CREATE TYPE avoir_statut AS ENUM (
      'brouillon',
      'valide',
      'impute',
      'annule'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ecriture_compte_type') THEN
    CREATE TYPE ecriture_compte_type AS ENUM (
      'facture',
      'paiement',
      'avoir',
      'imputation_avoir',
      'ajustement'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_channel') THEN
    CREATE TYPE onboarding_channel AS ENUM (
      'inscription_site',
      'invitation_labo'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'file_kind') THEN
    CREATE TYPE file_kind AS ENUM (
      'scan_3d',
      'photo',
      'document',
      'certificat',
      'autre'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mode_fabrication') THEN
    CREATE TYPE mode_fabrication AS ENUM (
      'manuelle',
      'numerique_3d',
      'orthodontie'
    );
  END IF;
END
$$;

-- ============================================
-- PARAMETRES LABO (singleton)
-- ============================================
CREATE TABLE IF NOT EXISTS parametres_labo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key BOOLEAN NOT NULL DEFAULT true UNIQUE,

  -- Regles operationnelles
  validation_manuelle_comptes BOOLEAN NOT NULL DEFAULT true,
  formats_3d_autorises TEXT[] NOT NULL DEFAULT ARRAY['stl', 'obj', 'ply', 'zip'],
  max_upload_scan_mb INTEGER NOT NULL DEFAULT 100 CHECK (max_upload_scan_mb > 0 AND max_upload_scan_mb <= 2048),
  retention_scans_annees INTEGER NOT NULL DEFAULT 10 CHECK (retention_scans_annees BETWEEN 1 AND 30),

  -- Finance / compta
  mode_facturation TEXT NOT NULL DEFAULT 'selon_profil',
  format_export_comptable TEXT NOT NULL DEFAULT 'csv_standard',
  gestion_avoirs_active BOOLEAN NOT NULL DEFAULT true,
  mode_avoir TEXT NOT NULL DEFAULT 'credit_client_sans_wallet',

  -- Gouvernance
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_mode_avoir_fixed CHECK (mode_avoir = 'credit_client_sans_wallet')
);

CREATE TRIGGER tr_parametres_labo_updated_at
  BEFORE UPDATE ON parametres_labo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

INSERT INTO parametres_labo (singleton_key)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM parametres_labo);

-- ============================================
-- INVITATIONS / ONBOARDING
-- ============================================
CREATE TABLE IF NOT EXISTS invitations_inscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nom TEXT,
  prenom TEXT,
  role_cible user_role NOT NULL DEFAULT 'dentiste',
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  onboarding_source onboarding_channel NOT NULL DEFAULT 'invitation_labo',
  token TEXT NOT NULL UNIQUE,
  expire_at TIMESTAMPTZ NOT NULL,
  accepte_at TIMESTAMPTZ,
  annule_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_invitation_dates CHECK (annule_at IS NULL OR accepte_at IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations_inscription(email);
CREATE INDEX IF NOT EXISTS idx_invitations_cabinet ON invitations_inscription(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expire ON invitations_inscription(expire_at);

-- Source onboarding sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_source onboarding_channel DEFAULT 'inscription_site';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_validation TIMESTAMPTZ;

-- ============================================
-- FACTURATION
-- ============================================
CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  commande_id UUID REFERENCES commandes(id) ON DELETE SET NULL,

  statut facture_statut NOT NULL DEFAULT 'brouillon',
  date_emission DATE,
  date_echeance DATE,

  montant_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  montant_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
  montant_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
  solde_du DECIMAL(10,2) NOT NULL DEFAULT 0,

  devise TEXT NOT NULL DEFAULT 'eur',
  notes TEXT,

  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factures_dentiste ON factures(dentiste_id);
CREATE INDEX IF NOT EXISTS idx_factures_cabinet ON factures(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_date_emission ON factures(date_emission);

CREATE TRIGGER tr_factures_updated_at
  BEFORE UPDATE ON factures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS facture_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  commande_item_id UUID REFERENCES commande_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire DECIMAL(10,2) NOT NULL DEFAULT 0,
  taux_tva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  total_ligne_ht DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ligne_tva DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_ligne_ttc DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facture_lignes_facture ON facture_lignes(facture_id);

-- Numerotation facture
CREATE OR REPLACE FUNCTION generate_numero_facture()
RETURNS TRIGGER AS $$
DECLARE
  annee TEXT;
  prochain_num INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN
    RETURN NEW;
  END IF;

  annee := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 7) AS INTEGER)), 0) + 1
    INTO prochain_num
    FROM factures
    WHERE numero LIKE 'FAC-' || annee || '-%';

  NEW.numero := 'FAC-' || annee || '-' || LPAD(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_factures_numero ON factures;
CREATE TRIGGER tr_factures_numero
  BEFORE INSERT ON factures
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_facture();

-- ============================================
-- AVOIRS (sans wallet)
-- ============================================
CREATE TABLE IF NOT EXISTS avoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,

  statut avoir_statut NOT NULL DEFAULT 'valide',
  motif TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  solde_restant DECIMAL(10,2) NOT NULL CHECK (solde_restant >= 0),

  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_avoir_solde CHECK (solde_restant <= montant)
);

CREATE INDEX IF NOT EXISTS idx_avoirs_dentiste ON avoirs(dentiste_id);
CREATE INDEX IF NOT EXISTS idx_avoirs_cabinet ON avoirs(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_avoirs_facture ON avoirs(facture_id);
CREATE INDEX IF NOT EXISTS idx_avoirs_statut ON avoirs(statut);

CREATE TRIGGER tr_avoirs_updated_at
  BEFORE UPDATE ON avoirs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Numerotation avoir
CREATE OR REPLACE FUNCTION generate_numero_avoir()
RETURNS TRIGGER AS $$
DECLARE
  annee TEXT;
  prochain_num INTEGER;
BEGIN
  IF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN
    RETURN NEW;
  END IF;

  annee := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 7) AS INTEGER)), 0) + 1
    INTO prochain_num
    FROM avoirs
    WHERE numero LIKE 'AVOIR-' || annee || '-%';

  NEW.numero := 'AVOIR-' || annee || '-' || LPAD(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_avoirs_numero ON avoirs;
CREATE TRIGGER tr_avoirs_numero
  BEFORE INSERT ON avoirs
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_avoir();

-- Grand livre client (credit client sans wallet)
CREATE TABLE IF NOT EXISTS ecritures_compte_client (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cabinet_id UUID REFERENCES cabinets(id) ON DELETE SET NULL,
  facture_id UUID REFERENCES factures(id) ON DELETE SET NULL,
  avoir_id UUID REFERENCES avoirs(id) ON DELETE SET NULL,
  paiement_id UUID REFERENCES paiements(id) ON DELETE SET NULL,

  type_ecriture ecriture_compte_type NOT NULL,
  libelle TEXT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_ledger_reference CHECK (
    facture_id IS NOT NULL OR avoir_id IS NOT NULL OR paiement_id IS NOT NULL OR type_ecriture = 'ajustement'
  )
);

CREATE INDEX IF NOT EXISTS idx_ledger_dentiste ON ecritures_compte_client(dentiste_id);
CREATE INDEX IF NOT EXISTS idx_ledger_cabinet ON ecritures_compte_client(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ecritures_compte_client(created_at DESC);

-- Lien paiement -> facture (sans casser paiement commande existant)
ALTER TABLE paiements
  ADD COLUMN IF NOT EXISTS facture_id UUID REFERENCES factures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_paiements_facture ON paiements(facture_id);

-- ============================================
-- ENRICHISSEMENT DOSSIERS TRAVAUX
-- ============================================
ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS mode_fabrication mode_fabrication DEFAULT 'manuelle';

ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS schema_dentaire JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS teinte_details JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS infos_travail JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE commande_items
  ADD COLUMN IF NOT EXISTS instructions_qc TEXT;

-- ============================================
-- ENRICHISSEMENT FICHIERS (3D scans, photos, docs)
-- ============================================
ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS file_kind file_kind NOT NULL DEFAULT 'autre';

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS format_3d TEXT;

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS parent_fichier_id UUID REFERENCES fichiers(id) ON DELETE SET NULL;

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS visible_praticien BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS apercu_disponible BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS uploaded_via onboarding_channel DEFAULT 'inscription_site';

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_fichiers_kind ON fichiers(file_kind);
CREATE INDEX IF NOT EXISTS idx_fichiers_parent ON fichiers(parent_fichier_id);
CREATE INDEX IF NOT EXISTS idx_fichiers_commande_kind ON fichiers(commande_id, file_kind);

-- ============================================
-- RLS nouvelles tables
-- ============================================
ALTER TABLE parametres_labo ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations_inscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecritures_compte_client ENABLE ROW LEVEL SECURITY;

-- PARAMETRES LABO
DROP POLICY IF EXISTS "parametres_labo_select_auth" ON parametres_labo;
CREATE POLICY "parametres_labo_select_auth"
  ON parametres_labo FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "parametres_labo_admin_all" ON parametres_labo;
CREATE POLICY "parametres_labo_admin_all"
  ON parametres_labo FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- INVITATIONS
DROP POLICY IF EXISTS "invitations_admin_all" ON invitations_inscription;
CREATE POLICY "invitations_admin_all"
  ON invitations_inscription FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- FACTURES
DROP POLICY IF EXISTS "factures_select_access" ON factures;
CREATE POLICY "factures_select_access"
  ON factures FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "factures_admin_all" ON factures;
CREATE POLICY "factures_admin_all"
  ON factures FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- FACTURE LIGNES
DROP POLICY IF EXISTS "facture_lignes_select_access" ON facture_lignes;
CREATE POLICY "facture_lignes_select_access"
  ON facture_lignes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM factures
      WHERE factures.id = facture_lignes.facture_id
      AND (
        factures.dentiste_id = auth.uid()
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "facture_lignes_admin_all" ON facture_lignes;
CREATE POLICY "facture_lignes_admin_all"
  ON facture_lignes FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AVOIRS
DROP POLICY IF EXISTS "avoirs_select_access" ON avoirs;
CREATE POLICY "avoirs_select_access"
  ON avoirs FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "avoirs_admin_all" ON avoirs;
CREATE POLICY "avoirs_admin_all"
  ON avoirs FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- LEDGER
DROP POLICY IF EXISTS "ledger_select_access" ON ecritures_compte_client;
CREATE POLICY "ledger_select_access"
  ON ecritures_compte_client FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "ledger_admin_all" ON ecritures_compte_client;
CREATE POLICY "ledger_admin_all"
  ON ecritures_compte_client FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- REALTIME additions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE factures;
ALTER PUBLICATION supabase_realtime ADD TABLE avoirs;
ALTER PUBLICATION supabase_realtime ADD TABLE ecritures_compte_client;
