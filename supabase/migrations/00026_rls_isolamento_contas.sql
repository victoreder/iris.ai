-- Isolamento multi-tenant: usuários não veem outras contas, não se promovem a superadmin,
-- e o client JWT não lê/escreve colunas privilegiadas (plano, vencimento, tokens).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.users_share_conta(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_usuario_exists()
    AND EXISTS (
      SELECT 1
      FROM public.conta_membros a
      JOIN public.conta_membros b ON b.conta_id = a.conta_id
      WHERE a.user_id = auth.uid()
        AND b.user_id = p_other_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.impedir_mudanca_conta_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_superadmin() THEN
    RETURN NEW;
  END IF;
  IF NEW.conta_id IS DISTINCT FROM OLD.conta_id THEN
    RAISE EXCEPTION 'Não é permitido mover registros entre contas.';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Superadmin: trigger + privilégio de coluna
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.usuarios_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.created_at := OLD.created_at;

  IF NOT public.is_superadmin() THEN
    NEW.superadmin := OLD.superadmin;
  END IF;

  IF auth.uid() = OLD.id OR public.is_superadmin() THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para editar este usuário.';
END;
$$;

REVOKE INSERT, DELETE, TRUNCATE ON public.usuarios FROM anon, authenticated;
REVOKE UPDATE ON public.usuarios FROM anon, authenticated;
GRANT UPDATE (nome, email, telefone, foto_url, updated_at) ON public.usuarios TO authenticated;

-- ---------------------------------------------------------------------------
-- Contas: admin não altera plano, status, vencimento, slug nem número
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

  NEW.plano_id := OLD.plano_id;
  NEW.status := OLD.status;
  NEW.slug := OLD.slug;
  NEW.numero := OLD.numero;
  NEW.data_vencimento := OLD.data_vencimento;
  NEW.lembrete_vencimento_para := OLD.lembrete_vencimento_para;

  IF OLD.onboarding_pendente THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.onboarding_pendente := OLD.onboarding_pendente;
  NEW.onboarding_etapa_atual := OLD.onboarding_etapa_atual;
  NEW.onboarding_concluido_em := OLD.onboarding_concluido_em;
  NEW.empresa_tamanho_funcionarios := OLD.empresa_tamanho_funcionarios;
  NEW.empresa_como_conheceu := OLD.empresa_como_conheceu;
  NEW.campanha_estilo_principal := OLD.campanha_estilo_principal;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE INSERT, DELETE, TRUNCATE ON public.contas FROM anon, authenticated;
REVOKE UPDATE ON public.contas FROM anon, authenticated;
GRANT UPDATE (
  nome,
  email_contato,
  telefone,
  onboarding_pendente,
  onboarding_etapa_atual,
  onboarding_concluido_em,
  empresa_tamanho_funcionarios,
  empresa_como_conheceu,
  campanha_estilo_principal,
  updated_at
) ON public.contas TO authenticated;

-- ---------------------------------------------------------------------------
-- system_logs: só superadmin lê (antes qualquer usuário em `usuarios` via tudo)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS system_logs_select ON public.system_logs;
CREATE POLICY system_logs_select ON public.system_logs FOR SELECT TO authenticated
  USING (public.is_superadmin());

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.system_logs FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- feedback: só o autor e o superadmin
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS feedback_select ON public.feedback;
CREATE POLICY feedback_select ON public.feedback FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR usuario_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Token Meta: client não lê nem escreve o segredo
-- ---------------------------------------------------------------------------

ALTER TABLE public.leads_config
  ADD COLUMN IF NOT EXISTS meta_conectado boolean
  GENERATED ALWAYS AS (COALESCE(btrim(meta_access_token), '') <> '') STORED;

COMMENT ON COLUMN public.leads_config.meta_conectado IS
  'True se há access token Meta; o token em si não é exposto ao client.';

REVOKE SELECT (meta_access_token) ON public.leads_config FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_config FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tabelas de dados: client só SELECT (escrita via API / service role)
-- ---------------------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques_follow_ups FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques_mensagens FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques_origens FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques_eventos FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_cliques_meta_envios FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.leads_links FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.conta_membros FROM anon, authenticated;
REVOKE ALL ON public.leads_qr_share_tokens FROM anon, authenticated;

REVOKE INSERT, DELETE, TRUNCATE, UPDATE ON public.leads_instancias_whatsapp FROM anon, authenticated;
GRANT UPDATE (nome, updated_at) ON public.leads_instancias_whatsapp TO authenticated;

REVOKE INSERT, DELETE, TRUNCATE ON public.planos FROM anon;
REVOKE ALL ON public.planos FROM anon;

-- ---------------------------------------------------------------------------
-- Jornada: client ainda escreve; impedir troca de conta_id
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS leads_jornada_insert ON public.leads_jornada_etapas;
CREATE POLICY leads_jornada_insert ON public.leads_jornada_etapas FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin() OR public.user_can_write_conta(conta_id));

DROP POLICY IF EXISTS leads_jornada_delete ON public.leads_jornada_etapas;
CREATE POLICY leads_jornada_delete ON public.leads_jornada_etapas FOR DELETE TO authenticated
  USING (public.is_superadmin() OR public.user_is_admin_conta(conta_id));

REVOKE UPDATE (conta_id) ON public.leads_jornada_etapas FROM authenticated;

DROP POLICY IF EXISTS leads_jornada_update ON public.leads_jornada_etapas;
CREATE POLICY leads_jornada_update ON public.leads_jornada_etapas FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR public.user_can_write_conta(conta_id))
  WITH CHECK (public.is_superadmin() OR public.user_can_write_conta(conta_id));

DROP POLICY IF EXISTS leads_instancias_update ON public.leads_instancias_whatsapp;
CREATE POLICY leads_instancias_update ON public.leads_instancias_whatsapp FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR public.user_can_write_conta(conta_id))
  WITH CHECK (public.is_superadmin() OR public.user_can_write_conta(conta_id));

DROP POLICY IF EXISTS leads_config_write ON public.leads_config;
CREATE POLICY leads_config_write ON public.leads_config FOR ALL TO authenticated
  USING (public.is_superadmin() OR public.user_can_write_conta(conta_id))
  WITH CHECK (public.is_superadmin() OR public.user_can_write_conta(conta_id));

-- ---------------------------------------------------------------------------
-- conta_id imutável no JWT
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_conta_id_membros ON public.conta_membros;
CREATE TRIGGER trg_conta_id_membros
  BEFORE UPDATE ON public.conta_membros
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_leads_config ON public.leads_config;
CREATE TRIGGER trg_conta_id_leads_config
  BEFORE UPDATE ON public.leads_config
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_instancias ON public.leads_instancias_whatsapp;
CREATE TRIGGER trg_conta_id_instancias
  BEFORE UPDATE ON public.leads_instancias_whatsapp
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_links ON public.leads_links;
CREATE TRIGGER trg_conta_id_links
  BEFORE UPDATE ON public.leads_links
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_cliques ON public.leads_cliques;
CREATE TRIGGER trg_conta_id_cliques
  BEFORE UPDATE ON public.leads_cliques
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_jornada ON public.leads_jornada_etapas;
CREATE TRIGGER trg_conta_id_jornada
  BEFORE UPDATE ON public.leads_jornada_etapas
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_logs ON public.leads_logs;
CREATE TRIGGER trg_conta_id_logs
  BEFORE UPDATE ON public.leads_logs
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_eventos ON public.leads_cliques_eventos;
CREATE TRIGGER trg_conta_id_eventos
  BEFORE UPDATE ON public.leads_cliques_eventos
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_mensagens ON public.leads_cliques_mensagens;
CREATE TRIGGER trg_conta_id_mensagens
  BEFORE UPDATE ON public.leads_cliques_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_origens ON public.leads_cliques_origens;
CREATE TRIGGER trg_conta_id_origens
  BEFORE UPDATE ON public.leads_cliques_origens
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_follow_ups ON public.leads_cliques_follow_ups;
CREATE TRIGGER trg_conta_id_follow_ups
  BEFORE UPDATE ON public.leads_cliques_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

DROP TRIGGER IF EXISTS trg_conta_id_feedback ON public.feedback;
CREATE TRIGGER trg_conta_id_feedback
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.impedir_mudanca_conta_id();

-- ---------------------------------------------------------------------------
-- RPCs privilegiadas: não executar com JWT de cliente
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.verificar_vencimentos_contas() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verificar_vencimentos_contas() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_vencimentos_contas() TO service_role;

REVOKE ALL ON FUNCTION public.criar_conta(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_conta(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.criar_conta(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- anon: nenhum acesso a tabelas de negócio
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.tablename);
  END LOOP;
END $$;

-- perfis legado (se ainda existir): sem policy = sem acesso JWT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'perfis'
  ) THEN
    REVOKE ALL ON TABLE public.perfis FROM anon, authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
