import { extractSenderJid } from "./evolutionLeads.js";
import {
  extractMediaFileNameFromItem,
  fetchMediaFromEvolution,
  isFetchableMediaTipo,
} from "./evolutionMedia.js";
import {
  buildMensagemMediaKey,
  extensionFromMime,
  isS3Configured,
  uploadToS3,
} from "./s3Storage.js";

const TIPO_LABELS = {
  imagem: "[Imagem]",
  video: "[Vídeo]",
  audio: "[Áudio]",
  documento: "[Documento]",
  sticker: "[Figurinha]",
  contato: "[Contato]",
  localizacao: "[Localização]",
  outro: "[Mensagem]",
};

export function extractMessageIdFromWebhookItem(item) {
  const key = item?.key ?? item?.data?.key ?? {};
  const id = key.id ?? item?.id ?? item?.data?.id;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

export function extractMessageTimestampFromWebhookItem(item) {
  const raw =
    item?.messageTimestamp ??
    item?.data?.messageTimestamp ??
    item?.timestamp ??
    item?.data?.timestamp;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 1e12 ? raw : raw * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }

  return new Date().toISOString();
}

export function detectMessageTipoFromWebhookItem(item, text) {
  if (String(text ?? "").trim()) {
    const msg = item?.message ?? item?.data?.message ?? {};
    if (msg.imageMessage) return "imagem";
    if (msg.videoMessage) return "video";
    if (msg.audioMessage || msg.pttMessage) return "audio";
    if (msg.documentMessage) return "documento";
    if (msg.stickerMessage) return "sticker";
    return "texto";
  }

  const msg = item?.message ?? item?.data?.message ?? {};
  if (msg.conversation || msg.extendedTextMessage) return "texto";
  if (msg.imageMessage) return "imagem";
  if (msg.videoMessage) return "video";
  if (msg.audioMessage || msg.pttMessage) return "audio";
  if (msg.documentMessage) return "documento";
  if (msg.stickerMessage) return "sticker";
  if (msg.contactMessage) return "contato";
  if (msg.locationMessage || msg.liveLocationMessage) return "localizacao";
  return "outro";
}

export function formatMensagemConteudo(texto, tipo) {
  const trimmed = String(texto ?? "").trim();
  if (trimmed) return trimmed.slice(0, 4000);
  return TIPO_LABELS[tipo] ?? TIPO_LABELS.outro;
}

async function resolveMediaForMensagem({ instanceName, item, tipo, contaId, cliqueId, messageId }) {
  if (!isFetchableMediaTipo(tipo) || !isS3Configured() || !instanceName || !messageId) {
    return { mediaUrl: null, mediaMime: null, mediaNome: extractMediaFileNameFromItem(item) };
  }

  const media = await fetchMediaFromEvolution(instanceName, item, {
    convertToMp4: tipo === "video",
  });

  if (!media) {
    return { mediaUrl: null, mediaMime: null, mediaNome: extractMediaFileNameFromItem(item) };
  }

  const ext = extensionFromMime(media.mime, tipo === "sticker" ? "webp" : "bin");
  const key = buildMensagemMediaKey({ contaId, cliqueId, messageId, ext });

  try {
    const mediaUrl = await uploadToS3(key, media.buffer, media.mime);
    return {
      mediaUrl,
      mediaMime: media.mime,
      mediaNome: media.fileName ?? extractMediaFileNameFromItem(item),
    };
  } catch (err) {
    console.error("resolveMediaForMensagem:", err?.message);
    return { mediaUrl: null, mediaMime: media.mime, mediaNome: media.fileName };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function recordLeadMensagem(
  supabase,
  { contaId, cliqueId, instanciaId, fromMe, item, text, instanceName }
) {
  if (!contaId || !cliqueId) return;

  const tipo = detectMessageTipoFromWebhookItem(item, text);
  const messageId = extractMessageIdFromWebhookItem(item);
  const remoteJid = extractSenderJid(item);

  const { mediaUrl, mediaMime, mediaNome } = await resolveMediaForMensagem({
    instanceName,
    item,
    tipo,
    contaId,
    cliqueId,
    messageId,
  });

  const texto = formatMensagemConteudo(text, tipo);

  const row = {
    conta_id: contaId,
    clique_id: cliqueId,
    instancia_id: instanciaId || null,
    from_me: Boolean(fromMe),
    texto,
    tipo,
    message_id: messageId,
    remote_jid: remoteJid || null,
    mensagem_em: extractMessageTimestampFromWebhookItem(item),
    media_url: mediaUrl,
    media_mime: mediaMime,
    media_nome: mediaNome,
  };

  try {
    const { error } = await supabase.from("leads_cliques_mensagens").insert(row);
    if (error && error.code !== "23505") {
      console.error("recordLeadMensagem:", error.message);
    }
  } catch (e) {
    console.error("recordLeadMensagem:", e?.message);
  }
}

/**
 * Marca a mensagem que disparou alteração de etapa (webhook).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function markMensagemDisparouEtapa(supabase, { cliqueId, messageId, etapa }) {
  if (!cliqueId || !messageId || !etapa) return;

  try {
    const { error } = await supabase
      .from("leads_cliques_mensagens")
      .update({
        disparou_etapa: true,
        etapa_nome: etapa.nome ?? null,
        etapa_representa_venda: Boolean(etapa.representa_venda),
      })
      .eq("clique_id", cliqueId)
      .eq("message_id", messageId);

    if (error) console.error("markMensagemDisparouEtapa:", error.message);
  } catch (e) {
    console.error("markMensagemDisparouEtapa:", e?.message);
  }
}
