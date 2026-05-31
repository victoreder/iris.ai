-- Viziom: usuarios, planos, system_logs, RLS reforçado, provisionamento via superadmin

-- ---------------------------------------------------------------------------
-- Planos (coluna final: preco)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planos'
      AND column_name = 'preco_mensal'
  ) THEN
    ALTER TABLE public.planos RENAME COLUMN preco_mensal TO preco;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  preco numeric(12, 2) NOT NULL DEFAULT 0,
  max_whatsapps integer,
  max_links integer,
  max_usuarios integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.planos (nome, slug, descricao, preco, max_whatsapps, max_links, max_usuarios)
VALUES
  ('Free', 'free', 'Plano inicial', 0, 1, 3, 2),
  ('Pro', 'pro', 'Plano profissional', 97, 5, 50, 10)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Usuarios (substitui perfis como fonte de verdade)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  nome text,
  superadmin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);

-- Migra perfis existentes (se a tabela ainda existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'perfis'
  ) THEN
    INSERT INTO public.usuarios (id, email, nome, created_at, updated_at)
    SELECT p.id, COALESCE(p.email, u.email), p.nome, p.created_at, p.updated_at
    FROM public.perfis p
    JOIN auth.users u ON u.id = p.id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Contas: campos extras
-- ---------------------------------------------------------------------------

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS plano_id uuid REFERENCES public.planos (id);

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS email_contato text;

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS telefone text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contas'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.contas
      ADD COLUMN status text NOT NULL DEFAULT 'ativa'
      CHECK (status IN ('ativa', 'suspensa', 'cancelada'));
  END IF;
END $$;

UPDATE public.contas
SET plano_id = (SELECT id FROM public.planos WHERE slug = 'free' LIMIT 1)
WHERE plano_id IS NULL;

-- ---------------------------------------------------------------------------
-- Logs de sistema (superadmin)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  nivel text NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'sucesso', 'erro', 'aviso')),
  mensagem text NOT NULL,
  detalhes jsonb,
  usuario_id uuid REFERENCES public.usuarios (id) ON DELETE SET NULL,
  conta_id uuid REFERENCES public.contas (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT superadmin FROM public.usuarios WHERE id = auth.uid()),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.current_usuario_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_user_conta_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cm.conta_id
  FROM public.conta_membros cm
  WHERE cm.user_id = auth.uid()
    AND public.current_usuario_exists();
$$;

CREATE OR REPLACE FUNCTION public.users_share_conta(p_other_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conta_membros a
    JOIN public.conta_membros b ON b.conta_id = a.conta_id
    WHERE a.user_id = auth.uid()
      AND b.user_id = p_other_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers: proteger colunas sensíveis
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contas_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_superadmin() THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT public.user_is_admin_conta(OLD.id) THEN
    RAISE EXCEPTION 'Sem permissão para editar esta conta.';
  END IF;

  -- Campos editáveis pelo admin da conta: nome, email_contato, telefone
  NEW.plano_id := OLD.plano_id;
  NEW.status := OLD.status;
  NEW.slug := OLD.slug;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contas_before_update ON public.contas;
CREATE TRIGGER contas_before_update
  BEFORE UPDATE ON public.contas
  FOR EACH ROW EXECUTE FUNCTION public.contas_before_update();

CREATE OR REPLACE FUNCTION public.usuarios_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Manutenção pelo postgres/service role (SQL Editor, migrations)
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT public.is_superadmin() AND NEW.superadmin IS DISTINCT FROM OLD.superadmin THEN
    NEW.superadmin := OLD.superadmin;
  END IF;

  IF auth.uid() = OLD.id OR public.is_superadmin() THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Sem permissão para editar este usuário.';
END;
$$;

DROP TRIGGER IF EXISTS usuarios_before_update ON public.usuarios;
CREATE TRIGGER usuarios_before_update
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.usuarios_before_update();

-- Não criar usuarios automaticamente no signup (provisionamento via superadmin/backend)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ---------------------------------------------------------------------------
-- RPC criar_conta: apenas superadmin
-- ---------------------------------------------------------------------------

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
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Apenas superadmin pode criar contas.';
  END IF;

  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  INSERT INTO public.contas (nome, slug, plano_id)
  VALUES (
    trim(p_nome),
    trim(p_slug),
    (SELECT id FROM public.planos WHERE slug = 'free' LIMIT 1)
  )
  RETURNING * INTO v_conta;

  RETURN v_conta;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS: drop policies antigas de perfis/contas/planos
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'perfis'
  ) THEN
    DROP POLICY IF EXISTS perfis_select ON public.perfis;
    DROP POLICY IF EXISTS perfis_update ON public.perfis;
  END IF;
END $$;

DROP POLICY IF EXISTS contas_select ON public.contas;
DROP POLICY IF EXISTS contas_insert ON public.contas;
DROP POLICY IF EXISTS contas_update ON public.contas;
DROP POLICY IF EXISTS contas_delete ON public.contas;
DROP POLICY IF EXISTS membros_select ON public.conta_membros;
DROP POLICY IF EXISTS membros_insert ON public.conta_membros;
DROP POLICY IF EXISTS membros_update ON public.conta_membros;
DROP POLICY IF EXISTS membros_delete ON public.conta_membros;
DROP POLICY IF EXISTS leads_logs_select ON public.leads_logs;

DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
DROP POLICY IF EXISTS planos_select ON public.planos;
DROP POLICY IF EXISTS planos_insert ON public.planos;
DROP POLICY IF EXISTS planos_update ON public.planos;
DROP POLICY IF EXISTS planos_delete ON public.planos;
DROP POLICY IF EXISTS system_logs_select ON public.system_logs;
DROP POLICY IF EXISTS system_logs_insert ON public.system_logs;
DROP POLICY IF EXISTS system_logs_update ON public.system_logs;
DROP POLICY IF EXISTS system_logs_delete ON public.system_logs;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Usuarios
CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR id = auth.uid()
    OR public.users_share_conta(id)
  );

CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR id = auth.uid())
  WITH CHECK (public.is_superadmin() OR id = auth.uid());

-- Planos: todos autenticados com registro em usuarios podem ler; só superadmin escreve
CREATE POLICY planos_select ON public.planos FOR SELECT TO authenticated
  USING (public.current_usuario_exists() OR public.is_superadmin());

CREATE POLICY planos_insert ON public.planos FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY planos_update ON public.planos FOR UPDATE TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY planos_delete ON public.planos FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Contas
CREATE POLICY contas_select ON public.contas FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR id IN (SELECT public.get_user_conta_ids())
  );

CREATE POLICY contas_insert ON public.contas FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY contas_update ON public.contas FOR UPDATE TO authenticated
  USING (
    public.is_superadmin()
    OR public.user_is_admin_conta(id)
  )
  WITH CHECK (
    public.is_superadmin()
    OR public.user_is_admin_conta(id)
  );

CREATE POLICY contas_delete ON public.contas FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Membros: visualizar mesma conta; CUD admin da conta ou superadmin
CREATE POLICY membros_select ON public.conta_membros FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );

CREATE POLICY membros_insert ON public.conta_membros FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin()
    OR public.user_is_admin_conta(conta_id)
  );

CREATE POLICY membros_update ON public.conta_membros FOR UPDATE TO authenticated
  USING (public.is_superadmin() OR public.user_is_admin_conta(conta_id))
  WITH CHECK (public.is_superadmin() OR public.user_is_admin_conta(conta_id));

CREATE POLICY membros_delete ON public.conta_membros FOR DELETE TO authenticated
  USING (public.is_superadmin() OR public.user_is_admin_conta(conta_id));

-- System logs
CREATE POLICY system_logs_select ON public.system_logs FOR SELECT TO authenticated
  USING (public.current_usuario_exists() OR public.is_superadmin());

CREATE POLICY system_logs_insert ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin());

CREATE POLICY system_logs_update ON public.system_logs FOR UPDATE TO authenticated
  USING (public.is_superadmin());

CREATE POLICY system_logs_delete ON public.system_logs FOR DELETE TO authenticated
  USING (public.is_superadmin());

-- Leads logs: superadmin vê tudo
CREATE POLICY leads_logs_select ON public.leads_logs FOR SELECT TO authenticated
  USING (
    public.is_superadmin()
    OR conta_id IN (SELECT public.get_user_conta_ids())
  );

-- Superadmin bypass em leads (SELECT)
DROP POLICY IF EXISTS leads_config_select ON public.leads_config;
CREATE POLICY leads_config_select ON public.leads_config FOR SELECT TO authenticated
  USING (public.is_superadmin() OR conta_id IN (SELECT public.get_user_conta_ids()));

DROP POLICY IF EXISTS leads_instancias_select ON public.leads_instancias_whatsapp;
CREATE POLICY leads_instancias_select ON public.leads_instancias_whatsapp FOR SELECT TO authenticated
  USING (public.is_superadmin() OR conta_id IN (SELECT public.get_user_conta_ids()));

DROP POLICY IF EXISTS leads_links_select ON public.leads_links;
CREATE POLICY leads_links_select ON public.leads_links FOR SELECT TO authenticated
  USING (public.is_superadmin() OR conta_id IN (SELECT public.get_user_conta_ids()));

DROP POLICY IF EXISTS leads_cliques_select ON public.leads_cliques;
CREATE POLICY leads_cliques_select ON public.leads_cliques FOR SELECT TO authenticated
  USING (public.is_superadmin() OR conta_id IN (SELECT public.get_user_conta_ids()));

DROP POLICY IF EXISTS leads_jornada_select ON public.leads_jornada_etapas;
CREATE POLICY leads_jornada_select ON public.leads_jornada_etapas FOR SELECT TO authenticated
  USING (public.is_superadmin() OR conta_id IN (SELECT public.get_user_conta_ids()));

-- Defina o primeiro superadmin manualmente após rodar esta migration:
-- UPDATE public.usuarios SET superadmin = true WHERE email = 'seu@email.com';
