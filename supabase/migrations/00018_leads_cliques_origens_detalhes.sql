-- Campos completos de rastreio por origem (espelho do clique de entrada)

ALTER TABLE public.leads_cliques_origens
  ADD COLUMN IF NOT EXISTS instancia_id uuid REFERENCES public.leads_instancias_whatsapp (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS os text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

UPDATE public.leads_cliques_origens o
SET
  instancia_id = c.instancia_id,
  device_type = c.device_type,
  browser = c.browser,
  os = c.os,
  ip_address = c.ip_address,
  user_agent = c.user_agent
FROM public.leads_cliques c
WHERE o.origem_clique_id = c.id
  AND (
    o.instancia_id IS NULL
    OR o.device_type IS NULL
    OR o.browser IS NULL
    OR o.os IS NULL
    OR o.ip_address IS NULL
    OR o.user_agent IS NULL
  );

COMMENT ON COLUMN public.leads_cliques_origens.instancia_id IS 'Instância WhatsApp do clique de origem.';
COMMENT ON COLUMN public.leads_cliques_origens.device_type IS 'Tipo de dispositivo no clique (mobile, desktop…).';
