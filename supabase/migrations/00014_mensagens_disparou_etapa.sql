-- Indica se a mensagem disparou mudança de etapa na jornada

ALTER TABLE public.leads_cliques_mensagens
  ADD COLUMN IF NOT EXISTS disparou_etapa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS etapa_nome text,
  ADD COLUMN IF NOT EXISTS etapa_representa_venda boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.leads_cliques_mensagens.disparou_etapa IS 'True quando esta mensagem causou alteração de etapa no webhook.';
COMMENT ON COLUMN public.leads_cliques_mensagens.etapa_nome IS 'Nome da etapa atingida por esta mensagem.';
COMMENT ON COLUMN public.leads_cliques_mensagens.etapa_representa_venda IS 'True quando a etapa atingida representa venda.';
