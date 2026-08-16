const { UAZAPI_API_URL } = process.env;

function getUazapiBase() {
  return String(UAZAPI_API_URL ?? "").trim().replace(/\/+$/, "");
}

function messageRoot(item) {
  if (!item || typeof item !== "object") return {};
  if (item.chatid || item.messageid || item.mediaType || item.content) return item;
  return item.message ?? item.data ?? item;
}

function contentObject(item) {
  const root = messageRoot(item);
  const c = root.content ?? item?.content;
  return c && typeof c === "object" && !Array.isArray(c) ? c : {};
}

function extractMediaMimeFromItem(item) {
  const content = contentObject(item);
  if (content.mimetype) return String(content.mimetype);
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
  const content = contentObject(item);
  if (content.fileName) return String(content.fileName);
  if (content.filename) return String(content.filename);
  if (content.title) return String(content.title);
  const msg = item?.message ?? item?.data?.message ?? {};
  return msg.documentMessage?.fileName || msg.documentMessage?.title || null;
}

export function isFetchableMediaTipo(tipo) {
  return ["imagem", "video", "audio", "documento", "sticker"].includes(tipo);
}

export function normalizeMediaMime(mime, tipo) {
  const base = String(mime ?? "").split(";")[0].trim().toLowerCase();
  if (base) return base;
  if (tipo === "audio") return "audio/ogg";
  if (tipo === "sticker") return "image/webp";
  if (tipo === "imagem") return "image/jpeg";
  if (tipo === "video") return "video/mp4";
  return "application/octet-stream";
}

function downloadIdsFromItem(item) {
  const root = messageRoot(item);
  const ids = [];
  const push = (v) => {
    const s = v != null ? String(v).trim() : "";
    if (s && !ids.includes(s)) ids.push(s);
  };
  push(root.id);
  push(item?.id);
  push(root.messageid);
  push(item?.messageid);
  return ids;
}

function isJsonContentType(ct) {
  return String(ct ?? "").toLowerCase().includes("json");
}

async function fetchFileUrl(fileURL, token, base) {
  let url = String(fileURL ?? "").trim();
  if (!url) return null;
  if (url.startsWith("/") && base) url = `${base}${url}`;
  if (!/^https?:\/\//i.test(url)) return null;

  const headers = {};
  if (token) headers.token = token;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return null;
  return { buf, contentType: res.headers.get("content-type") };
}

/**
 * Baixa mídia da UAZAPI (POST /message/download) para upload no S3.
 * @param {string} token
 * @returns {Promise<{ buffer: Buffer, mime: string, fileName: string | null } | null>}
 */
export async function fetchMediaFromEvolution(token, item) {
  const base = getUazapiBase();
  const t = String(token ?? "").trim();
  if (!base || !t) {
    console.error("fetchMediaFromUazapi: UAZAPI_API_URL ou token ausente");
    return null;
  }

  const ids = downloadIdsFromItem(item);
  if (ids.length === 0) {
    console.error("fetchMediaFromUazapi: id da mensagem ausente");
    return null;
  }

  const url = `${base}/message/download`;
  const bodies = ids.flatMap((id) => [{ id }, { messageid: id }]);

  for (const body of bodies) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: t,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        let errBody = {};
        try {
          errBody = errText ? JSON.parse(errText) : {};
        } catch {
          /* ignore */
        }
        console.error(
          "fetchMediaFromUazapi:",
          errBody?.message ?? errBody?.error ?? res.status,
          body
        );
        continue;
      }

      const ct = res.headers.get("content-type") || "";
      const raw = Buffer.from(await res.arrayBuffer());
      if (raw.length === 0) continue;

      if (!isJsonContentType(ct)) {
        return {
          buffer: raw,
          mime: ct || extractMediaMimeFromItem(item) || "application/octet-stream",
          fileName: extractMediaFileNameFromItem(item),
        };
      }

      let data;
      try {
        data = JSON.parse(raw.toString("utf8"));
      } catch {
        console.error("fetchMediaFromUazapi: JSON inválido");
        continue;
      }

      const payload = data?.response ?? data?.data ?? data;
      const fileURL = payload?.fileURL ?? payload?.fileUrl ?? payload?.url ?? data?.fileURL;
      const mime =
        payload?.mimetype ??
        payload?.mimeType ??
        data?.mimetype ??
        extractMediaMimeFromItem(item) ??
        "application/octet-stream";
      const fileName =
        payload?.fileName ?? payload?.filename ?? extractMediaFileNameFromItem(item) ?? null;

      if (typeof fileURL === "string" && fileURL.trim()) {
        const file =
          (await fetchFileUrl(fileURL, t, base)) || (await fetchFileUrl(fileURL, null, base));
        if (file) {
          const fileMime =
            file.contentType && !file.contentType.includes("octet-stream")
              ? file.contentType
              : String(mime);
          return {
            buffer: file.buf,
            mime: fileMime,
            fileName: fileName ? String(fileName) : null,
          };
        }
      }

      const base64 =
        payload?.base64 ?? payload?.media?.base64 ?? payload?.fileBase64 ?? data?.base64 ?? null;
      if (typeof base64 === "string" && base64.trim()) {
        const cleaned = base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(cleaned, "base64");
        if (buffer.length > 0) {
          return {
            buffer,
            mime: String(mime),
            fileName: fileName ? String(fileName) : null,
          };
        }
      }
    } catch (err) {
      console.error("fetchMediaFromUazapi:", err?.message);
    }
  }

  console.error("fetchMediaFromUazapi: não foi possível baixar a mídia", ids);
  return null;
}
