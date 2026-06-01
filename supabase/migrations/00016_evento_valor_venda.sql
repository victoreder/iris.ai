-- Histórico: alteração de valor de venda individual do lead

ALTER TABLE public.leads_cliques_eventos
  DROP CONSTRAINT IF EXISTS leads_cliques_eventos_tipo_check;

ALTER TABLE public.leads_cliques_eventos
  ADD CONSTRAINT leads_cliques_eventos_tipo_check
  CHECK (tipo IN ('lead_novo', 'etapa_alterada', 'meta_enviado', 'valor_venda_alterado'));
