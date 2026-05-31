-- PostgREST precisa de FK explícita para embed usuarios ↔ conta_membros

ALTER TABLE public.conta_membros
  DROP CONSTRAINT IF EXISTS conta_membros_user_id_usuarios_fkey;

ALTER TABLE public.conta_membros
  ADD CONSTRAINT conta_membros_user_id_usuarios_fkey
  FOREIGN KEY (user_id) REFERENCES public.usuarios (id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT conta_membros_user_id_usuarios_fkey ON public.conta_membros IS
  'Permite embed PostgREST: usuarios ↔ conta_membros';
