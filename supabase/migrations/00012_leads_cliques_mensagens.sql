-- Histórico de mensagens WhatsApp por lead (entrada e saída)

CREATE TABLE public.leads_cliques_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  instancia_id uuid REFERENCES public.leads_instancias_whatsapp (id) ON DELETE SET NULL,
  from_me boolean NOT NULL,
  texto text,
  tipo text NOT NULL DEFAULT 'texto'
    CHECK (tipo IN ('texto', 'imagem', 'video', 'audio', 'documento', 'sticker', 'contato', 'localizacao', 'outro')),
  message_id text,
  remote_jid text,
  mensagem_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_cliques_mensagens_clique ON public.leads_cliques_mensagens (clique_id, mensagem_em ASC);
CREATE INDEX idx_leads_cliques_mensagens_conta ON public.leads_cliques_mensagens (conta_id, mensagem_em DESC);

CREATE UNIQUE INDEX idx_leads_cliques_mensagens_dedup
  ON public.leads_cliques_mensagens (clique_id, message_id)
  WHERE message_id IS NOT NULL;

ALTER TABLE public.leads_cliques_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_cliques_mensagens_select ON public.leads_cliques_mensagens FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );
