-- Viziom SaaS — schema multi-tenant (contas + usuários + leads)

-- ---------------------------------------------------------------------------
-- Contas e membros
-- ---------------------------------------------------------------------------

CREATE TABLE public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contas IS 'Empresa/workspace central do Viziom.';

CREATE TABLE public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfis IS 'Perfil público do usuário autenticado.';

CREATE TYPE public.conta_papel AS ENUM ('admin', 'membro', 'visualizador');

CREATE TABLE public.conta_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  papel public.conta_papel NOT NULL DEFAULT 'membro',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conta_id, user_id)
);

CREATE INDEX idx_conta_membros_user ON public.conta_membros (user_id);
CREATE INDEX idx_conta_membros_conta ON public.conta_membros (conta_id);

COMMENT ON TABLE public.conta_membros IS 'Vínculo N:N usuário ↔ conta com papel.';

-- ---------------------------------------------------------------------------
-- Leads (todas com conta_id)
-- ---------------------------------------------------------------------------

CREATE TABLE public.leads_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL UNIQUE REFERENCES public.contas (id) ON DELETE CASCADE,
  meta_pixel_id text,
  meta_access_token text,
  meta_test_event_code text,
  evento_padrao text NOT NULL DEFAULT 'Lead',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads_instancias_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  nome text NOT NULL,
  instance_name text NOT NULL UNIQUE,
  telefone text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'conectando', 'conectado', 'desconectado')),
  webhook_configurado boolean NOT NULL DEFAULT false,
  webhook_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_instancias_conta ON public.leads_instancias_whatsapp (conta_id);

CREATE TABLE public.leads_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  instancia_id uuid NOT NULL REFERENCES public.leads_instancias_whatsapp (id) ON DELETE RESTRICT,
  mensagem_inicial text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_links_conta ON public.leads_links (conta_id);
CREATE INDEX idx_leads_links_slug ON public.leads_links (slug);

CREATE TABLE public.leads_cliques (
  id text PRIMARY KEY,
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.leads_links (id) ON DELETE CASCADE,
  instancia_id uuid REFERENCES public.leads_instancias_whatsapp (id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  ttclid text,
  referrer text,
  landing_url text,
  ip_address text,
  user_agent text,
  device_type text,
  browser text,
  os text,
  fbp text,
  fbc text,
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'convertido', 'expirado')),
  telefone_lead text,
  mensagem_recebida text,
  convertido_at timestamptz,
  meta_enviado boolean NOT NULL DEFAULT false,
  meta_event_id text,
  meta_erro text,
  meta_enviado_at timestamptz,
  etapa_id uuid,
  etapa_atualizada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_cliques_conta ON public.leads_cliques (conta_id, created_at DESC);
CREATE INDEX idx_leads_cliques_link ON public.leads_cliques (link_id, created_at DESC);
CREATE INDEX idx_leads_cliques_instancia ON public.leads_cliques (instancia_id, created_at DESC);
CREATE INDEX idx_leads_cliques_status ON public.leads_cliques (status);

CREATE TABLE public.leads_jornada_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES public.contas (id) ON DELETE CASCADE,
  instancia_id uuid NOT NULL REFERENCES public.leads_instancias_whatsapp (id) ON DELETE CASCADE,
  nome text NOT NULL,
  posicao integer NOT NULL DEFAULT 1,
  palavras_chave text[] NOT NULL DEFAULT '{}',
  evento_meta text NOT NULL DEFAULT 'Lead',
  primeiro_contato boolean NOT NULL DEFAULT false,
  representa_venda boolean NOT NULL DEFAULT false,
  valor_venda numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_leads_jornada_um_primeiro_contato
  ON public.leads_jornada_etapas (instancia_id)
  WHERE primeiro_contato = true;

CREATE INDEX idx_leads_jornada_instancia_pos ON public.leads_jornada_etapas (instancia_id, posicao);

ALTER TABLE public.leads_cliques
  ADD CONSTRAINT leads_cliques_etapa_id_fkey
  FOREIGN KEY (etapa_id) REFERENCES public.leads_jornada_etapas (id) ON DELETE SET NULL;

CREATE TABLE public.leads_cliques_meta_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clique_id text NOT NULL REFERENCES public.leads_cliques (id) ON DELETE CASCADE,
  etapa_id uuid NOT NULL REFERENCES public.leads_jornada_etapas (id) ON DELETE CASCADE,
  evento_meta text NOT NULL,
  meta_event_id text,
  meta_enviado boolean NOT NULL DEFAULT false,
  meta_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clique_id, etapa_id)
);

CREATE TABLE public.leads_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid REFERENCES public.contas (id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('clique', 'webhook', 'meta')),
  nivel text NOT NULL DEFAULT 'info' CHECK (nivel IN ('info', 'sucesso', 'erro', 'aviso')),
  mensagem text NOT NULL,
  detalhes jsonb,
  clique_id text REFERENCES public.leads_cliques (id) ON DELETE SET NULL,
  link_id uuid REFERENCES public.leads_links (id) ON DELETE SET NULL,
  instance_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_logs_conta ON public.leads_logs (conta_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_conta_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conta_id FROM public.conta_membros WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_conta_papel(p_conta_id uuid)
RETURNS public.conta_papel
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT papel FROM public.conta_membros
  WHERE user_id = auth.uid() AND conta_id = p_conta_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_conta(p_conta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conta_membros
    WHERE user_id = auth.uid()
      AND conta_id = p_conta_id
      AND papel IN ('admin', 'membro')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_admin_conta(p_conta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conta_membros
    WHERE user_id = auth.uid()
      AND conta_id = p_conta_id
      AND papel = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger: criar perfil ao signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conta_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_instancias_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_cliques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_jornada_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_cliques_meta_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_logs ENABLE ROW LEVEL SECURITY;

-- Perfis
CREATE POLICY perfis_select ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY perfis_update ON public.perfis FOR UPDATE TO authenticated USING (id = auth.uid());

-- Contas
CREATE POLICY contas_select ON public.contas FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY contas_insert ON public.contas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY contas_update ON public.contas FOR UPDATE TO authenticated
  USING (public.user_is_admin_conta(id));

-- Membros
CREATE POLICY membros_select ON public.conta_membros FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY membros_insert ON public.conta_membros FOR INSERT TO authenticated
  WITH CHECK (
    public.user_is_admin_conta(conta_id)
    OR NOT EXISTS (SELECT 1 FROM public.conta_membros cm WHERE cm.conta_id = conta_membros.conta_id)
  );
CREATE POLICY membros_update ON public.conta_membros FOR UPDATE TO authenticated
  USING (public.user_is_admin_conta(conta_id));
CREATE POLICY membros_delete ON public.conta_membros FOR DELETE TO authenticated
  USING (public.user_is_admin_conta(conta_id));

-- Macro para tabelas leads com conta_id
-- SELECT: qualquer membro; INSERT/UPDATE: admin+membro; DELETE: admin

CREATE POLICY leads_config_select ON public.leads_config FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY leads_config_write ON public.leads_config FOR ALL TO authenticated
  USING (public.user_can_write_conta(conta_id))
  WITH CHECK (public.user_can_write_conta(conta_id));

CREATE POLICY leads_instancias_select ON public.leads_instancias_whatsapp FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY leads_instancias_insert ON public.leads_instancias_whatsapp FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_conta(conta_id));
CREATE POLICY leads_instancias_update ON public.leads_instancias_whatsapp FOR UPDATE TO authenticated
  USING (public.user_can_write_conta(conta_id));
CREATE POLICY leads_instancias_delete ON public.leads_instancias_whatsapp FOR DELETE TO authenticated
  USING (public.user_is_admin_conta(conta_id));

CREATE POLICY leads_links_select ON public.leads_links FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY leads_links_insert ON public.leads_links FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_conta(conta_id));
CREATE POLICY leads_links_update ON public.leads_links FOR UPDATE TO authenticated
  USING (public.user_can_write_conta(conta_id));
CREATE POLICY leads_links_delete ON public.leads_links FOR DELETE TO authenticated
  USING (public.user_is_admin_conta(conta_id));

CREATE POLICY leads_cliques_select ON public.leads_cliques FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY leads_cliques_update ON public.leads_cliques FOR UPDATE TO authenticated
  USING (public.user_can_write_conta(conta_id));

CREATE POLICY leads_jornada_select ON public.leads_jornada_etapas FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));
CREATE POLICY leads_jornada_insert ON public.leads_jornada_etapas FOR INSERT TO authenticated
  WITH CHECK (public.user_can_write_conta(conta_id));
CREATE POLICY leads_jornada_update ON public.leads_jornada_etapas FOR UPDATE TO authenticated
  USING (public.user_can_write_conta(conta_id));
CREATE POLICY leads_jornada_delete ON public.leads_jornada_etapas FOR DELETE TO authenticated
  USING (public.user_is_admin_conta(conta_id));

CREATE POLICY leads_meta_envios_select ON public.leads_cliques_meta_envios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads_cliques c
      WHERE c.id = clique_id AND c.conta_id IN (SELECT public.get_user_conta_ids())
    )
  );

CREATE POLICY leads_logs_select ON public.leads_logs FOR SELECT TO authenticated
  USING (conta_id IN (SELECT public.get_user_conta_ids()));

-- Service role bypasses RLS; anon has no access to admin tables.
-- Public go uses service role via API.
