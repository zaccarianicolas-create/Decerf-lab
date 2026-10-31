ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS billit_order_status TEXT,
  ADD COLUMN IF NOT EXISTS billit_delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS billit_is_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billit_is_delivered BOOLEAN,
  ADD COLUMN IF NOT EXISTS billit_paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0
    CHECK (billit_paid_amount >= 0),
  ADD COLUMN IF NOT EXISTS billit_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS billit_synced_at TIMESTAMPTZ;

ALTER TABLE public.avoirs
  ADD COLUMN IF NOT EXISTS billit_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS billit_order_status TEXT,
  ADD COLUMN IF NOT EXISTS billit_delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS billit_is_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billit_is_delivered BOOLEAN,
  ADD COLUMN IF NOT EXISTS billit_pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS billit_last_error TEXT,
  ADD COLUMN IF NOT EXISTS billit_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_avoirs_billit_order_id
  ON public.avoirs(billit_order_id)
  WHERE billit_order_id IS NOT NULL;

ALTER TABLE public.paiements
  ADD COLUMN IF NOT EXISTS billit_payment_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_paiements_billit_payment_key
  ON public.paiements(billit_payment_key)
  WHERE billit_payment_key IS NOT NULL;