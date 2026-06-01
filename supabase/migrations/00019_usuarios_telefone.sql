ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS telefone text;

COMMENT ON COLUMN public.usuarios.telefone IS 'Telefone pessoal do usuário logado (apenas dígitos).';
