-- Logs do modulo Leads (cliques, webhooks Evolution, Meta CAPI)

CREATE TABLE IF NOT EXISTS public.leads_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('clique', 'webhook', 'meta')),
  nivel text NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'sucesso', 'erro', 'aviso')),
  mensagem text NOT NULL,
  detalhes jsonb,
  clique_id text REFERENCES public.leads_cliques (id) ON DELETE SET NULL,
  link_id uuid REFERENCES public.leads_links (id) ON DELETE SET NULL,
  instance_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_logs IS 'Logs de cliques, webhooks Evolution e envios Meta do modulo Leads.';

CREATE INDEX IF NOT EXISTS idx_leads_logs_created_at ON public.leads_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_logs_tipo ON public.leads_logs (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_logs_clique_id ON public.leads_logs (clique_id);

ALTER TABLE public.leads_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_logs_authenticated_select"
  ON public.leads_logs
  FOR SELECT
  TO authenticated
  USING (true);
