-- Vencimento de contas + funções de renovação/cron

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS data_vencimento timestamptz;

CREATE INDEX IF NOT EXISTS idx_contas_vencimento
  ON public.contas (data_vencimento)
  WHERE status = 'ativa' AND data_vencimento IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dias_recorrencia(p_recorrencia text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_recorrencia
    WHEN 'mensal' THEN 30
    WHEN 'trimestral' THEN 90
    WHEN 'semestral' THEN 180
    WHEN 'anual' THEN 365
    ELSE 30
  END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_proxima_vencimento(
  p_recorrencia text,
  p_base timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_base + (public.dias_recorrencia(p_recorrencia) || ' days')::interval;
$$;

-- Suspende contas ativas com vencimento expirado
CREATE OR REPLACE FUNCTION public.verificar_vencimentos_contas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.contas
  SET status = 'suspensa', updated_at = now()
  WHERE status = 'ativa'
    AND NOT onboarding_pendente
    AND data_vencimento IS NOT NULL
    AND data_vencimento < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
