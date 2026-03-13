-- ============================================
-- MIGRATION: Patients, Mode réception, Certificats de conformité
-- Législation belge - AR 18/03/1999, Directive 93/42/CEE
-- Règlement (UE) 2017/745 MDR
-- ============================================

-- ============================================
-- ENUM: mode de réception du travail
-- ============================================
CREATE TYPE mode_reception AS ENUM ('envoi_numerique', 'enlevement');

-- ============================================
-- TABLE: patients
-- Fiches patients liées à un dentiste
-- ============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  dentiste_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE,
  sexe TEXT CHECK (sexe IN ('M', 'F', 'X')),
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_patients_dentiste ON patients(dentiste_id);
CREATE INDEX idx_patients_reference ON patients(reference);

-- Trigger updated_at
CREATE TRIGGER tr_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Numéro de référence patient auto
CREATE OR REPLACE FUNCTION generate_reference_patient()
RETURNS TRIGGER AS $$
DECLARE
  annee TEXT;
  prochain_num INTEGER;
BEGIN
  annee := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 6) AS INTEGER)), 0) + 1
    INTO prochain_num
    FROM patients
    WHERE reference LIKE 'PAT-' || annee || '-%';
  NEW.reference := 'PAT-' || annee || '-' || LPAD(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_patients_reference
  BEFORE INSERT ON patients
  FOR EACH ROW
  WHEN (NEW.reference IS NULL OR NEW.reference = '')
  EXECUTE FUNCTION generate_reference_patient();

-- ============================================
-- ALTER commandes: ajout patient_id + mode réception
-- ============================================
ALTER TABLE commandes ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE commandes ADD COLUMN mode_reception mode_reception DEFAULT 'envoi_numerique';
ALTER TABLE commandes ADD COLUMN adresse_enlevement TEXT;
ALTER TABLE commandes ADD COLUMN date_enlevement DATE;

CREATE INDEX idx_commandes_patient ON commandes(patient_id);

-- ============================================
-- TABLE: certificats_conformite
-- Certificat de conformité — dispositif médical sur mesure
-- AR 18/03/1999 + Règlement (UE) 2017/745
-- ============================================
CREATE TABLE certificats_conformite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_certificat TEXT NOT NULL UNIQUE,
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,

  -- Identification du laboratoire
  labo_nom TEXT NOT NULL DEFAULT 'DECERF LAB',
  labo_adresse TEXT,
  labo_responsable TEXT,
  labo_numero_agrement TEXT,

  -- Identification du praticien
  dentiste_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  dentiste_nom TEXT,
  dentiste_inami TEXT,  -- Numéro INAMI/RIZIV

  -- Description du dispositif
  patient_reference TEXT,  -- Référence anonymisée
  description_travail TEXT NOT NULL,
  materiaux_utilises TEXT,
  dents TEXT,
  lot_materiaux TEXT,  -- Traçabilité des lots

  -- Normes et conformité
  normes_appliquees TEXT NOT NULL DEFAULT 'Règlement (UE) 2017/745 relatif aux dispositifs médicaux - AR du 18/03/1999',
  declaration_conformite TEXT NOT NULL DEFAULT 'Le soussigné déclare que le dispositif médical sur mesure décrit ci-dessus est conforme aux exigences générales en matière de sécurité et de performances de l''Annexe I du Règlement (UE) 2017/745 et aux dispositions de l''Arrêté Royal du 18 mars 1999. Ce dispositif a été fabriqué exclusivement pour le patient identifié ci-dessus, sur prescription du praticien mentionné.',

  -- Contenu éditable complet (rendu final)
  contenu_complet TEXT,

  -- Métadonnées
  date_emission DATE NOT NULL DEFAULT CURRENT_DATE,
  signe_par TEXT,
  envoye_au_praticien BOOLEAN NOT NULL DEFAULT false,
  date_envoi TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificats_commande ON certificats_conformite(commande_id);
CREATE INDEX idx_certificats_dentiste ON certificats_conformite(dentiste_id);
CREATE INDEX idx_certificats_patient ON certificats_conformite(patient_id);

-- Trigger updated_at
CREATE TRIGGER tr_certificats_updated_at
  BEFORE UPDATE ON certificats_conformite
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Numéro de certificat auto
CREATE OR REPLACE FUNCTION generate_numero_certificat()
RETURNS TRIGGER AS $$
DECLARE
  annee TEXT;
  prochain_num INTEGER;
BEGIN
  annee := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_certificat FROM 7) AS INTEGER)), 0) + 1
    INTO prochain_num
    FROM certificats_conformite
    WHERE numero_certificat LIKE 'CERT-' || annee || '-%';
  NEW.numero_certificat := 'CERT-' || annee || '-' || LPAD(prochain_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_certificats_numero
  BEFORE INSERT ON certificats_conformite
  FOR EACH ROW
  WHEN (NEW.numero_certificat IS NULL OR NEW.numero_certificat = '')
  EXECUTE FUNCTION generate_numero_certificat();

-- ============================================
-- RLS pour patients
-- ============================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dentiste voit ses patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Dentiste crée ses patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (dentiste_id = auth.uid());

CREATE POLICY "Dentiste modifie ses patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin supprime patients"
  ON patients FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- RLS pour certificats_conformite
-- ============================================
ALTER TABLE certificats_conformite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses certificats"
  ON certificats_conformite FOR SELECT
  TO authenticated
  USING (
    dentiste_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin gère certificats"
  ON certificats_conformite FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Ajout du champ INAMI au profil dentiste
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS numero_inami TEXT;

-- ============================================
-- REALTIME pour patients
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE patients;
ALTER PUBLICATION supabase_realtime ADD TABLE certificats_conformite;
