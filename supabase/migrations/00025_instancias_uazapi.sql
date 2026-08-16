-- Dados da instância UAZAPI (token secreto; id externo do init)

ALTER TABLE public.leads_instancias_whatsapp
  ADD COLUMN IF NOT EXISTS token_instancia text,
  ADD COLUMN IF NOT EXISTS id_externo text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_instancias_id_externo
  ON public.leads_instancias_whatsapp (id_externo)
  WHERE id_externo IS NOT NULL;

COMMENT ON COLUMN public.leads_instancias_whatsapp.token_instancia IS
  'Token da instância UAZAPI (header token). Nunca expor ao client.';
COMMENT ON COLUMN public.leads_instancias_whatsapp.id_externo IS
  'UUID da instância na UAZAPI (resposta de POST /instance/init).';

-- Instâncias antigas da Evolution precisam reconectar
UPDATE public.leads_instancias_whatsapp
SET
  status = 'desconectado',
  updated_at = now()
WHERE token_instancia IS NULL
  AND status IN ('conectado', 'conectando');

REVOKE SELECT ON public.leads_instancias_whatsapp FROM anon;
REVOKE SELECT ON public.leads_instancias_whatsapp FROM authenticated;
REVOKE UPDATE (token_instancia) ON public.leads_instancias_whatsapp FROM authenticated;
GRANT SELECT (
  id,
  conta_id,
  nome,
  instance_name,
  telefone,
  status,
  webhook_configurado,
  webhook_erro,
  created_at,
  updated_at,
  id_externo
) ON public.leads_instancias_whatsapp TO authenticated;
