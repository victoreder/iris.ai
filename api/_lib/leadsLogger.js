import { getSupabase } from "../_lib.js";
import { findLeadsInstancia } from "./leadsWebhookMatch.js";

/**
 * @param {object} params
 * @param {'clique'|'webhook'|'meta'} params.tipo
 * @param {'info'|'sucesso'|'erro'|'aviso'} [params.nivel]
 * @param {string} params.mensagem
 * @param {object} [params.detalhes]
 * @param {string} [params.cliqueId]
 * @param {string} [params.linkId]
 * @param {string} [params.instanceName]
 * @param {import('@supabase/supabase-js').SupabaseClient} [params.supabase]
 */
export async function logLeadsEvent({
  tipo,
  nivel = "info",
  mensagem,
  detalhes = null,
  cliqueId = null,
  linkId = null,
  instanceName = null,
  contaId = null,
  supabase: existingSupabase = null,
}) {
  try {
    const supabase = existingSupabase ?? getSupabase();
    let resolvedContaId = contaId || null;
    if (!resolvedContaId && instanceName) {
      const inst = await findLeadsInstancia(supabase, { instanceName });
      resolvedContaId = inst?.conta_id ?? null;
    }
    const row = {
      conta_id: resolvedContaId,
      tipo,
      nivel,
      mensagem: String(mensagem ?? "").slice(0, 2000),
      detalhes: detalhes && typeof detalhes === "object" ? detalhes : null,
      clique_id: cliqueId || null,
      link_id: linkId || null,
      instance_name: instanceName ? String(instanceName).trim() : null,
    };
    const { error } = await supabase.from("leads_logs").insert(row);
    if (error) {
      console.error("logLeadsEvent:", error.message, error.code, error.details, error.hint);
    }
  } catch (e) {
    console.error("logLeadsEvent:", e?.message);
  }
}

/** Remove caracteres invisíveis e limita tamanho para log. */
export function sanitizeForLog(text, max = 500) {
  const s = String(text ?? "")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "·")
    .trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

const LOG_SKIP_KEYS = new Set([
  "base64",
  "token",
  "token_instancia",
  "JPEGThumbnail",
  "mediaKey",
  "fileEncSHA256",
  "fileSHA256",
  "scansSidecar",
  "firstScanSidecar",
  "waveform",
  "streamingSidecar",
  "URL",
]);

/**
 * Serializa payload do webhook para log (omite base64, limita strings grandes).
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
export function prepareValueForLog(value, depth = 0) {
  if (value == null) return value;
  if (depth > 12) return "[profundidade máxima]";

  if (typeof value === "string") {
    if (value.length > 8000) {
      return `${value.slice(0, 8000)}… [truncado, ${value.length} chars]`;
    }
    return value;
  }

  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((item) => prepareValueForLog(item, depth + 1));
  }

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (LOG_SKIP_KEYS.has(key)) {
      out[key] = `[omitido]`;
      continue;
    }
    out[key] = prepareValueForLog(val, depth + 1);
  }
  return out;
}

/** Body completo do webhook Evolution para gravar em leads_logs.detalhes. */
export function prepareWebhookBodyForLog(body) {
  return prepareValueForLog(body ?? {});
}
