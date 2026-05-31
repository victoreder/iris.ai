-- Feedback: urgência, contexto automático, screenshot e anexos
-- Usuarios: foto de perfil
-- Storage: buckets avatars (público) e feedback (privado)

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS urgencia text NOT NULL DEFAULT 'normal';

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS contexto jsonb;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS screenshot_path text;

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS anexos jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_urgencia_check'
      AND conrelid = 'public.feedback'::regclass
  ) THEN
    ALTER TABLE public.feedback
      ADD CONSTRAINT feedback_urgencia_check
      CHECK (urgencia IN ('normal', 'urgente'));
  END IF;
END $$;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS foto_url text;

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('feedback', 'feedback', false, 5242880)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- ---------------------------------------------------------------------------
-- Storage RLS: avatars
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS avatars_insert ON storage.objects;
DROP POLICY IF EXISTS avatars_update ON storage.objects;
DROP POLICY IF EXISTS avatars_delete ON storage.objects;
DROP POLICY IF EXISTS avatars_select ON storage.objects;

CREATE POLICY avatars_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_select ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- ---------------------------------------------------------------------------
-- Storage RLS: feedback
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS feedback_storage_insert ON storage.objects;
DROP POLICY IF EXISTS feedback_storage_select ON storage.objects;
DROP POLICY IF EXISTS feedback_storage_delete ON storage.objects;

CREATE POLICY feedback_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'feedback'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY feedback_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback'
    AND (
      public.is_superadmin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY feedback_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'feedback'
    AND (
      public.is_superadmin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
