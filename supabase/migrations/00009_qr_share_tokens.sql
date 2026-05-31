-- Link público temporário para compartilhar QR de conexão WhatsApp

CREATE TABLE IF NOT EXISTS public.leads_qr_share_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id uuid NOT NULL REFERENCES public.leads_instancias_whatsapp (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_qr_share_instancia
  ON public.leads_qr_share_tokens (instancia_id);

CREATE INDEX IF NOT EXISTS idx_leads_qr_share_expires
  ON public.leads_qr_share_tokens (expires_at);

ALTER TABLE public.leads_qr_share_tokens ENABLE ROW LEVEL SECURITY;
