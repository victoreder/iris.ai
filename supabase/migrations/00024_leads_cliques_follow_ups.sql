-- Follow-ups do lead: vários por clique, com data, observação e conclusão

CREATE TABLE public.leads_cliques_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  data_follow_up timestamptz NOT NULL,
  observacao text,
  concluido boolean NOT NULL DEFAULT false,
  concluido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_follow_ups_clique
  ON public.leads_cliques_follow_ups (clique_id, concluido, data_follow_up ASC);

CREATE INDEX idx_leads_follow_ups_conta
  ON public.leads_cliques_follow_ups (conta_id, data_follow_up ASC)
  WHERE concluido = false;

ALTER TABLE public.leads_cliques_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_follow_ups_select ON public.leads_cliques_follow_ups FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );

COMMENT ON TABLE public.leads_cliques_follow_ups IS 'Follow-ups do lead (data, observação e check de concluído).';

INSERT INTO public.leads_cliques_follow_ups (conta_id, clique_id, data_follow_up)
SELECT c.conta_id, c.id, c.data_follow_up
FROM public.leads_cliques c
WHERE c.data_follow_up IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.leads_cliques_follow_ups f
    WHERE f.clique_id = c.id
  );
