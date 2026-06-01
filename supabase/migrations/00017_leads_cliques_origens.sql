-- Origens adicionais do mesmo lead (mesmo telefone, nova campanha)

ALTER TABLE public.leads_cliques
  ADD COLUMN IF NOT EXISTS clique_principal_id text REFERENCES public.leads_cliques (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_principal
  ON public.leads_cliques (clique_principal_id)
  WHERE clique_principal_id IS NOT NULL;

CREATE TABLE public.leads_cliques_origens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  ordem int NOT NULL CHECK (ordem >= 1),
  origem_clique_id text REFERENCES public.leads_cliques (id) ON DELETE SET NULL,
  link_id uuid REFERENCES public.leads_links (id) ON DELETE SET NULL,
  campanha_nome text,
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
  fbp text,
  fbc text,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clique_id, ordem)
);

CREATE INDEX idx_leads_cliques_origens_clique ON public.leads_cliques_origens (clique_id, ordem ASC);
CREATE INDEX idx_leads_cliques_origens_conta ON public.leads_cliques_origens (conta_id);

ALTER TABLE public.leads_cliques_origens ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_cliques_origens_select ON public.leads_cliques_origens FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );

ALTER TABLE public.leads_cliques_eventos
  DROP CONSTRAINT IF EXISTS leads_cliques_eventos_tipo_check;

ALTER TABLE public.leads_cliques_eventos
  ADD CONSTRAINT leads_cliques_eventos_tipo_check
  CHECK (tipo IN ('lead_novo', 'etapa_alterada', 'meta_enviado', 'valor_venda_alterado', 'origem_adicional'));

COMMENT ON TABLE public.leads_cliques_origens IS 'Atribuições de campanha do lead (1ª, 2ª, 3ª origem…).';
COMMENT ON COLUMN public.leads_cliques.clique_principal_id IS 'Quando mesclado a um lead existente (mesmo telefone).';
