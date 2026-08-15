-- Campos CRM do lead: follow-up, reunião, observação e responsável

ALTER TABLE public.leads_cliques
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS data_follow_up timestamptz,
  ADD COLUMN IF NOT EXISTS data_reuniao timestamptz,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_follow_up
  ON public.leads_cliques (conta_id, data_follow_up)
  WHERE data_follow_up IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_reuniao
  ON public.leads_cliques (conta_id, data_reuniao)
  WHERE data_reuniao IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_responsavel
  ON public.leads_cliques (responsavel_id)
  WHERE responsavel_id IS NOT NULL;

COMMENT ON COLUMN public.leads_cliques.observacao IS 'Anotações internas do time sobre o lead.';
COMMENT ON COLUMN public.leads_cliques.data_follow_up IS 'Próximo follow-up combinado.';
COMMENT ON COLUMN public.leads_cliques.data_reuniao IS 'Reunião marcada com o lead.';
COMMENT ON COLUMN public.leads_cliques.responsavel_id IS 'Membro da conta responsável pelo lead.';
