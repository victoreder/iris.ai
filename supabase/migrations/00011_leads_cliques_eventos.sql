-- Histórico de leads: novo lead, mudança de etapa, envio Meta (atividade + detalhe)

CREATE TABLE public.leads_cliques_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('lead_novo', 'etapa_alterada', 'meta_enviado')),
  etapa_id uuid REFERENCES public.leads_jornada_etapas (id) ON DELETE SET NULL,
  etapa_nome text,
  etapa_anterior_id uuid REFERENCES public.leads_jornada_etapas (id) ON DELETE SET NULL,
  etapa_anterior_nome text,
  evento_meta text,
  meta_enviado boolean,
  meta_erro text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_cliques_eventos_conta ON public.leads_cliques_eventos (conta_id, created_at DESC);
CREATE INDEX idx_leads_cliques_eventos_clique ON public.leads_cliques_eventos (clique_id, created_at ASC);

ALTER TABLE public.leads_cliques_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_cliques_eventos_select ON public.leads_cliques_eventos FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );
