-- Jornada de leads por instância WhatsApp (etapas + funil)

CREATE TABLE IF NOT EXISTS public.leads_jornada_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instancia_id uuid NOT NULL REFERENCES public.leads_instancias_whatsapp (id) ON DELETE CASCADE,
  nome text NOT NULL,
  posicao integer NOT NULL DEFAULT 1,
  palavras_chave text[] NOT NULL DEFAULT '{}',
  evento_meta text NOT NULL DEFAULT 'Lead',
  primeiro_contato boolean NOT NULL DEFAULT false,
  representa_venda boolean NOT NULL DEFAULT false,
  valor_venda numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads_jornada_etapas IS 'Etapas da jornada por WhatsApp conectado.';
COMMENT ON COLUMN public.leads_jornada_etapas.palavras_chave IS 'Palavras em mensagens enviadas pela instância (fromMe) que movem o lead para esta etapa.';
COMMENT ON COLUMN public.leads_jornada_etapas.primeiro_contato IS 'Etapa da primeira mensagem recebida do lead (fromMe: false).';
COMMENT ON COLUMN public.leads_jornada_etapas.representa_venda IS 'Envia Purchase à Meta com valor_venda.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_jornada_um_primeiro_contato
  ON public.leads_jornada_etapas (instancia_id)
  WHERE primeiro_contato = true;

CREATE INDEX IF NOT EXISTS idx_leads_jornada_instancia_pos
  ON public.leads_jornada_etapas (instancia_id, posicao);

ALTER TABLE public.leads_cliques
  ADD COLUMN IF NOT EXISTS etapa_id uuid REFERENCES public.leads_jornada_etapas (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS etapa_atualizada_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_etapa ON public.leads_cliques (etapa_id);

CREATE TABLE IF NOT EXISTS public.leads_cliques_meta_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  etapa_id uuid NOT NULL REFERENCES public.leads_jornada_etapas (id) ON DELETE CASCADE,
  evento_meta text NOT NULL,
  meta_event_id text,
  meta_enviado boolean NOT NULL DEFAULT false,
  meta_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clique_id, etapa_id)
);

COMMENT ON TABLE public.leads_cliques_meta_envios IS 'Eventos Meta enviados por etapa da jornada (evita duplicata).';

-- Etapa padrão "Contato Inicial" para instâncias existentes
INSERT INTO public.leads_jornada_etapas (
  instancia_id,
  nome,
  posicao,
  palavras_chave,
  evento_meta,
  primeiro_contato,
  representa_venda
)
SELECT
  i.id,
  'Contato Inicial',
  1,
  '{}',
  'Lead',
  true,
  false
FROM public.leads_instancias_whatsapp i
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leads_jornada_etapas e
  WHERE e.instancia_id = i.id AND e.primeiro_contato = true
);

ALTER TABLE public.leads_jornada_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_cliques_meta_envios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_jornada_etapas_authenticated_all"
  ON public.leads_jornada_etapas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "leads_cliques_meta_envios_authenticated_select"
  ON public.leads_cliques_meta_envios FOR SELECT TO authenticated USING (true);
