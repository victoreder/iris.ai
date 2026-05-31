-- Corrige onboarding: INSERT + SELECT em contas falhava porque o usuário
-- ainda não estava em conta_membros no momento do RETURNING.

CREATE OR REPLACE FUNCTION public.criar_conta(p_nome text, p_slug text)
RETURNS public.contas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta public.contas;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF trim(p_nome) = '' THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;

  IF trim(p_slug) = '' THEN
    RAISE EXCEPTION 'Slug é obrigatório';
  END IF;

  INSERT INTO public.contas (nome, slug)
  VALUES (trim(p_nome), trim(p_slug))
  RETURNING * INTO v_conta;

  INSERT INTO public.conta_membros (conta_id, user_id, papel)
  VALUES (v_conta.id, v_uid, 'admin');

  RETURN v_conta;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_conta(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_conta(text, text) TO authenticated;

-- Corrige policy de insert em membros (primeiro admin da conta)
DROP POLICY IF EXISTS membros_insert ON public.conta_membros;
CREATE POLICY membros_insert ON public.conta_membros FOR INSERT TO authenticated
  WITH CHECK (
    public.user_is_admin_conta(conta_id)
    OR (
      user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.conta_membros cm WHERE cm.conta_id = conta_membros.conta_id
      )
    )
  );
