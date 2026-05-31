-- Permite UPDATE em usuarios via SQL Editor / service role (auth.uid() nulo)
-- Necessário para promover o primeiro superadmin.

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
