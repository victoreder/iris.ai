-- Mídia das mensagens WhatsApp (armazenada no S3/MinIO)

ALTER TABLE public.leads_cliques_mensagens
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS media_nome text;

COMMENT ON COLUMN public.leads_cliques_mensagens.media_url IS 'URL pública ou caminho do arquivo no bucket S3/MinIO.';
COMMENT ON COLUMN public.leads_cliques_mensagens.media_mime IS 'MIME type do arquivo de mídia.';
COMMENT ON COLUMN public.leads_cliques_mensagens.media_nome IS 'Nome original do arquivo (documentos).';
