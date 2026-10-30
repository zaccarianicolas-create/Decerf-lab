CREATE TABLE IF NOT EXISTS public.billit_connections (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.billit_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.billit_connections FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billit_connections TO service_role;

ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS billit_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS billit_status TEXT
    CHECK (billit_status IS NULL OR billit_status IN ('created', 'sent', 'error')),
  ADD COLUMN IF NOT EXISTS billit_last_error TEXT,
  ADD COLUMN IF NOT EXISTS billit_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_factures_billit_order_id
  ON public.factures(billit_order_id)
  WHERE billit_order_id IS NOT NULL;