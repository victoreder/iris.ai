-- Lead sem link (WhatsApp direto): sem origem de campanha; instância para rastreio.

ALTER TABLE public.leads_cliques
  ADD COLUMN IF NOT EXISTS instancia_id uuid REFERENCES public.leads_instancias_whatsapp (id) ON DELETE SET NULL;

UPDATE public.leads_cliques c
SET instancia_id = l.instancia_id
FROM public.leads_links l
WHERE c.link_id = l.id AND c.instancia_id IS NULL;

ALTER TABLE public.leads_cliques
  ALTER COLUMN link_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_cliques_instancia
  ON public.leads_cliques (instancia_id, created_at DESC);

COMMENT ON COLUMN public.leads_cliques.instancia_id IS 'Instância WhatsApp; obrigatório quando link_id é null (contato direto).';
COMMENT ON COLUMN public.leads_cliques.link_id IS 'Null = lead entrou direto no WhatsApp (sem origem de link).';
