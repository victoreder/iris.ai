-- Controle de lembrete por e-mail (vence amanhã) — evita reenvio no mesmo ciclo

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS lembrete_vencimento_para timestamptz;

COMMENT ON COLUMN public.contas.lembrete_vencimento_para IS
  'Data de vencimento para a qual o lembrete "vence amanhã" já foi enviado';
