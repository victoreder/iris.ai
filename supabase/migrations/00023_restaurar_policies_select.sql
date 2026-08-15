-- Restaura policies de SELECT apagadas por rollback acidental.
-- Sem elas, o login no Auth funciona, mas o app não lê usuarios/contas.

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR id = auth.uid()
    OR public.users_share_conta(id)
  );

DROP POLICY IF EXISTS contas_select ON public.contas;
CREATE POLICY contas_select ON public.contas FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR id IN (SELECT public.get_user_conta_ids())
  );
