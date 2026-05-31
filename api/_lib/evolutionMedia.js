const { EVOLUTION_API_URL, EVOLUTION_API_KEY } = process.env;

function getEvolutionBase() {
  return String(EVOLUTION_API_URL ?? "").trim().replace(/\/+$/, "");
}

function getEvolutionKey() {
  return String(EVOLUTION_API_KEY ?? "").trim();
}

function extractWebhookMessageKey(item) {
  const key = item?.key ?? item?.data?.key ?? {};
  if (!key?.id) return null;
  return {
    id: String(key.id),
    remoteJid: key.remoteJid ?? undefined,
    fromMe: key.fromMe ?? undefined,
    participant: key.participant ?? undefined,
  };
}

function extractMediaMimeFromItem(item) {
  const msg = item?.message ?? item?.data?.message ?? {};
  return (
    msg.imageMessage?.mimetype ||
    msg.videoMessage?.mimetype ||
    msg.audioMessage?.mimetype ||
    msg.documentMessage?.mimetype ||
    msg.stickerMessage?.mimetype ||
    null
  );
}

export function extractMediaFileNameFromItem(item) {
  const msg = item?.message ?? item?.data?.message ?? {};
  return msg.documentMessage?.fileName || msg.documentMessage?.title || null;
}

export function isFetchableMediaTipo(tipo) {
  return ["imagem", "video", "audio", "documento", "sticker"].includes(tipo);
}

/**
 * Baixa mídia da Evolution API (base64) para upload no S3.
 * @returns {Promise<{ buffer: Buffer, mime: string, fileName: string | null } | null>}
 */
export async function fetchMediaFromEvolution(instanceName, item, { convertToMp4 = false } = {}) {
  const base = getEvolutionBase();
  const apikey = getEvolutionKey();
  if (!base || !apikey || !instanceName) return null;

  const messageKey = extractWebhookMessageKey(item);
  if (!messageKey) return null;

  const url = `${base}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey,
      },
      body: JSON.stringify({
        message: { key: messageKey },
        convertToMp4: Boolean(convertToMp4),
      }),
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("fetchMediaFromEvolution: resposta inválida", text.slice(0, 200));
      return null;
    }

    if (!res.ok) {
      console.error("fetchMediaFromEvolution:", data?.message ?? data?.error ?? res.status);
      return null;
    }

    const payload = data?.response ?? data?.data ?? data;
    const base64 =
      payload?.base64 ??
      payload?.media?.base64 ??
      data?.base64 ??
      null;

    if (!base64 || typeof base64 !== "string") {
      console.error("fetchMediaFromEvolution: base64 ausente");
      return null;
    }

    const mime =
      payload?.mimetype ??
      payload?.mimeType ??
      data?.mimetype ??
      extractMediaMimeFromItem(item) ??
      "application/octet-stream";

    const fileName =
      payload?.fileName ??
      payload?.filename ??
      extractMediaFileNameFromItem(item) ??
      null;

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) return null;

    return { buffer, mime: String(mime), fileName: fileName ? String(fileName) : null };
  } catch (err) {
    console.error("fetchMediaFromEvolution:", err?.message);
    return null;
  }
}
