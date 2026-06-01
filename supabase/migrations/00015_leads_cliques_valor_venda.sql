-- Valor de venda individual por lead (sobrescreve o padrão da etapa)

ALTER TABLE public.leads_cliques
  ADD COLUMN IF NOT EXISTS valor_venda numeric(12, 2);

COMMENT ON COLUMN public.leads_cliques.valor_venda IS 'Valor da venda deste lead; null usa o valor padrão da etapa.';
