-- Planos: recorrencia, max_leads, onboarding em contas, feedback bugs/sugestões

-- ---------------------------------------------------------------------------
-- Planos
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS max_leads integer;

ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS recorrencia text;

UPDATE public.planos SET recorrencia = 'mensal' WHERE recorrencia IS NULL;

ALTER TABLE public.planos
  ALTER COLUMN recorrencia SET DEFAULT 'mensal';

ALTER TABLE public.planos
  ALTER COLUMN recorrencia SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planos_recorrencia_check'
      AND conrelid = 'public.planos'::regclass
  ) THEN
    ALTER TABLE public.planos
      ADD CONSTRAINT planos_recorrencia_check
      CHECK (recorrencia IN ('mensal', 'trimestral', 'semestral', 'anual'));
  END IF;
END $$;

-- preco_mensal → preco (ou cria preco se a tabela veio de outro schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'preco_mensal'
  ) THEN
    ALTER TABLE public.planos RENAME COLUMN preco_mensal TO preco;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'preco'
  ) THEN
    ALTER TABLE public.planos ADD COLUMN preco numeric(12, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE public.planos
SET max_leads = max_links
WHERE max_leads IS NULL AND max_links IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Contas: onboarding
-- ---------------------------------------------------------------------------

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS onboarding_pendente boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Feedback (bugs, sugestões, melhorias)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid REFERENCES public.contas (id) ON DELETE SET NULL,
  usuario_id uuid NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('bug', 'sugestao', 'melhoria')),
  titulo text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'em_analise', 'resolvido', 'fechado')),
  resposta text,
  resolvido_por uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_conta ON public.feedback (conta_id);

-- ---------------------------------------------------------------------------
-- Trigger contas: permitir onboarding (nome + slug)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contas_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_superadmin() OR auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT public.user_is_admin_conta(OLD.id) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta conta.';
  END IF;

  IF OLD.onboarding_pendente THEN
    NEW.plano_id := OLD.plano_id;
    NEW.status := OLD.status;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.plano_id := OLD.plano_id;
  NEW.status := OLD.status;
  NEW.slug := OLD.slug;
  NEW.onboarding_pendente := OLD.onboarding_pendente;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS feedback
-- ---------------------------------------------------------------------------

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_select ON public.feedback;
DROP POLICY IF EXISTS feedback_insert ON public.feedback;
DROP POLICY IF EXISTS feedback_update ON public.feedback;
DROP POLICY IF EXISTS feedback_delete ON public.feedback;

CREATE POLICY feedback_select ON public.feedback FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR usuario_id = auth.uid()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );

CREATE POLICY feedback_insert ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (
    public.current_usuario_exists()
    AND usuario_id = auth.uid()
    AND (
      conta_id IS NULL
      OR conta_id IN (SELECT public.get_user_conta_ids())
    )
  );

CREATE POLICY feedback_update ON public.feedback FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY feedback_delete ON public.feedback FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Trigger updated_at feedback
CREATE OR REPLACE FUNCTION public.feedback_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolvido', 'fechado') AND OLD.status NOT IN ('resolvido', 'fechado') THEN
    NEW.resolvido_em := now();
    NEW.resolvido_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feedback_set_updated_at ON public.feedback;
CREATE TRIGGER feedback_set_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.feedback_set_updated_at();
