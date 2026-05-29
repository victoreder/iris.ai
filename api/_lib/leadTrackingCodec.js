/**
 * Marcador invisivel na mensagem WhatsApp.
 * Usa apenas U+200B e U+200C — o U+2060 (Word Joiner) e U+200D (ZWJ) aparecem como no WhatsApp.
 */

/** @deprecated formato antigo — mantido só para decodificar mensagens já enviadas */
const LEGACY_MARKER_START = "\u2060";
const LEGACY_BIT_ZERO = "\u200c";
const LEGACY_BIT_ONE = "\u200d";

/** Formato atual: compatível com WhatsApp (invisível na maioria dos clientes) */
const BIT_ZERO = "\u200b";
const BIT_ONE = "\u200c";

const INVISIBLE_PATTERN = /[\u200b\u200c]+$/;

/**
 * @param {string} trackingId
 * @returns {string}
 */
export function encodeTrackingMarker(trackingId) {
  const id = String(trackingId ?? "").trim();
  if (!id) return "";
  const bytes = new TextEncoder().encode(id);
  let bits = "";
  for (const b of bytes) {
    bits += b.toString(2).padStart(8, "0");
  }
  let marker = "";
  for (const bit of bits) {
    marker += bit === "0" ? BIT_ZERO : BIT_ONE;
  }
  return marker;
}

function bitsToTrackingId(bits) {
  if (bits.length < 8 || bits.length % 8 !== 0) return null;
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  try {
    const decoded = new TextDecoder().decode(new Uint8Array(bytes)).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function decodeBitsFromZwRun(zwRun, format = "current") {
  let bits = "";
  for (const ch of zwRun) {
    if (format === "legacy") {
      if (ch === LEGACY_BIT_ZERO) bits += "0";
      else if (ch === LEGACY_BIT_ONE) bits += "1";
      else return null;
    } else {
      if (ch === BIT_ZERO) bits += "0";
      else if (ch === BIT_ONE) bits += "1";
      else return null;
    }
  }
  return bitsToTrackingId(bits);
}

/** Decodifica sufixo invisível (formato atual: só U+200B/U+200C no final). */
export function decodeTrackingIdFromMessage(text) {
  const raw = String(text ?? "");

  const legacyIdx = raw.indexOf(LEGACY_MARKER_START);
  if (legacyIdx !== -1) {
    const segment = raw.slice(legacyIdx + LEGACY_MARKER_START.length);
    let bits = "";
    for (const ch of segment) {
      if (ch === LEGACY_BIT_ZERO) bits += "0";
      else if (ch === LEGACY_BIT_ONE) bits += "1";
      else break;
    }
    const decoded = bitsToTrackingId(bits);
    if (decoded) return decoded;
  }

  const match = raw.match(INVISIBLE_PATTERN);
  if (!match) return null;
  return decodeBitsFromZwRun(match[0], "current");
}

/** Varre todos os blocos invisíveis da mensagem (caso o WhatsApp insira espaços no meio). */
export function decodeTrackingIdLoose(text) {
  const strict = decodeTrackingIdFromMessage(text);
  if (strict) return strict;

  const raw = String(text ?? "");
  const runs = raw.match(/[\u200b\u200c\u200d\u2060]+/g);
  if (!runs?.length) return null;

  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    const fmt = run.includes(LEGACY_BIT_ONE) || run.includes(LEGACY_MARKER_START) ? "legacy" : "current";
    const decoded = decodeBitsFromZwRun(run, fmt);
    if (decoded) return decoded;
  }
  return null;
}

export function stripInvisibleChars(text) {
  return String(text ?? "").replace(/[\u200b-\u200d\u2060\ufeff]/g, "");
}

/**
 * @param {string} mensagemInicial
 * @param {string} trackingId
 */
export function buildWhatsAppMessage(mensagemInicial, trackingId) {
  const visible = String(mensagemInicial ?? "").trim();
  const marker = encodeTrackingMarker(trackingId);
  return visible + marker;
}
