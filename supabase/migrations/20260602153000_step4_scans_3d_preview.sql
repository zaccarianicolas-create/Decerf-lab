-- ============================================
-- DECERF LAB - Etape 4: scans 3D V1
-- Upload multi-format, versioning, preview metadata
-- ============================================

ALTER TABLE fichiers
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NOT NULL DEFAULT 'fichiers-stl';

CREATE INDEX IF NOT EXISTS idx_fichiers_bucket ON fichiers(storage_bucket);
CREATE INDEX IF NOT EXISTS idx_fichiers_bucket_format ON fichiers(storage_bucket, format_3d);

-- Realtime already enabled on fichiers via existing publication? not needed here.
