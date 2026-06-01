-- Onboarding guiado de primeiro acesso (conta)

ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS onboarding_etapa_atual integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_concluido_em timestamptz,
  ADD COLUMN IF NOT EXISTS empresa_tamanho_funcionarios text,
  ADD COLUMN IF NOT EXISTS empresa_como_conheceu text,
  ADD COLUMN IF NOT EXISTS campanha_estilo_principal text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contas_campanha_estilo_principal_check'
      AND conrelid = 'public.contas'::regclass
  ) THEN
    ALTER TABLE public.contas
      ADD CONSTRAINT contas_campanha_estilo_principal_check
      CHECK (
        campanha_estilo_principal IS NULL
        OR campanha_estilo_principal IN (
          'anuncios_site_whatsapp',
          'anuncios_whatsapp',
          'campanha_whatsapp'
        )
      );
  END IF;
END $$;

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

  IF OLD.onboarding_pendente THEN
    NEW.data_vencimento := OLD.data_vencimento;
    NEW.lembrete_vencimento_para := OLD.lembrete_vencimento_para;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  NEW.slug := OLD.slug;
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
