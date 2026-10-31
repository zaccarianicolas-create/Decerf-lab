ALTER TABLE public.billit_connections
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production'));
