import { supabase } from "@/lib/supabase";
import { getRecentErrors } from "@/lib/errorBuffer";
import { sanitizeStorageFileName } from "@/lib/storageUrls";
import type { FeedbackAnexo, FeedbackContexto, FeedbackTipo, FeedbackUrgencia } from "@/types/usuario";

const BUCKET = "feedback";

interface SubmitFeedbackInput {
  userId: string;
  contaId: string | null;
  tipo: FeedbackTipo;
  urgencia: FeedbackUrgencia;
  titulo: string;
  descricao: string;
  contexto: Omit<FeedbackContexto, "erros">;
  screenshot: Blob | null;
  anexos: File[];
}

async function uploadFile(path: string, file: Blob, contentType?: string) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: contentType ?? (file instanceof File ? file.type : undefined),
  });
  if (error) throw error;
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<string> {
  const feedbackId = crypto.randomUUID();
  const basePath = `${input.userId}/${feedbackId}`;

  let screenshotPath: string | null = null;
  if (input.screenshot) {
    screenshotPath = `${basePath}/screenshot.png`;
    await uploadFile(screenshotPath, input.screenshot, "image/png");
  }

  const anexosMeta: FeedbackAnexo[] = [];
  for (const file of input.anexos) {
    const safeName = sanitizeStorageFileName(file.name);
    const path = `${basePath}/anexo-${crypto.randomUUID().slice(0, 8)}-${safeName}`;
    await uploadFile(path, file, file.type);
    anexosMeta.push({
      nome: file.name,
      path,
      tipo: file.type || "application/octet-stream",
      tamanho: file.size,
    });
  }

  const contexto: FeedbackContexto = {
    ...input.contexto,
    erros: getRecentErrors(),
  };

  const { error } = await supabase.from("feedback").insert({
    id: feedbackId,
    usuario_id: input.userId,
    conta_id: input.contaId,
    tipo: input.tipo,
    urgencia: input.urgencia,
    titulo: input.titulo.trim(),
    descricao: input.descricao.trim(),
    contexto,
    screenshot_path: screenshotPath,
    anexos: anexosMeta,
  });

  if (error) throw error;
  return feedbackId;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}
