-- Rastreador de leads WhatsApp (links go.hublabel.com.br + Evolution + Meta CAPI)

CREATE TABLE IF NOT EXISTS public.leads_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_pixel_id text,
  meta_access_token text,
  meta_test_event_code text,
  evento_padrao text NOT NULL DEFAULT 'Lead',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_config IS 'Configuracao Meta Conversions API (singleton).';

INSERT INTO public.leads_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.leads_config LIMIT 1);

CREATE TABLE IF NOT EXISTS public.leads_instancias_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instance_name text NOT NULL UNIQUE,
  telefone text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'conectando', 'conectado', 'desconectado')),
  webhook_configurado boolean NOT NULL DEFAULT false,
  webhook_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_instancias_whatsapp IS 'Instancias Evolution conectadas ao modulo Leads.';

CREATE TABLE IF NOT EXISTS public.leads_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  instancia_id uuid NOT NULL REFERENCES public.leads_instancias_whatsapp (id) ON DELETE RESTRICT,
  mensagem_inicial text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_links IS 'Links de rastreio publicos: go.hublabel.com.br/l/{slug}.';

CREATE TABLE IF NOT EXISTS public.leads_cliques (
  id text PRIMARY KEY,
  link_id uuid NOT NULL REFERENCES public.leads_links (id) ON DELETE CASCADE,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  ttclid text,
  referrer text,
  landing_url text,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  fbp text,
  fbc text,
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'convertido', 'expirado')),
  telefone_lead text,
  mensagem_recebida text,
  convertido_at timestamptz,
  meta_enviado boolean NOT NULL DEFAULT false,
  meta_event_id text,
  meta_erro text,
  meta_enviado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_cliques IS 'Sessao do lead: clique no link ate conversao no WhatsApp.';
COMMENT ON COLUMN public.leads_cliques.id IS 'tracking_id codificado invisivel na mensagem WhatsApp.';

CREATE INDEX IF NOT EXISTS idx_leads_links_slug ON public.leads_links (slug);
CREATE INDEX IF NOT EXISTS idx_leads_links_instancia ON public.leads_links (instancia_id);
CREATE INDEX IF NOT EXISTS idx_leads_cliques_link_created ON public.leads_cliques (link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_cliques_status ON public.leads_cliques (status);
CREATE INDEX IF NOT EXISTS idx_leads_cliques_created_at ON public.leads_cliques (created_at DESC);

ALTER TABLE public.leads_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_instancias_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_cliques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_config_authenticated_all"
  ON public.leads_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "leads_instancias_authenticated_all"
  ON public.leads_instancias_whatsapp FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "leads_links_authenticated_all"
  ON public.leads_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "leads_cliques_authenticated_select"
  ON public.leads_cliques FOR SELECT TO authenticated USING (true);
