import { messageMatchesKeyword } from "./leadsUtils.js";
import { stripInvisibleChars } from "./leadTrackingCodec.js";

/**
 * Etapas da jornada por instância WhatsApp.
 */

export function parsePalavrasChave(raw) {
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((k) => String(k).trim()).filter(Boolean);
    } catch {
      /* texto simples */
    }
    return raw
      .split(/[,;]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return [];
}

export async function ensureContatoInicialEtapa(supabase, instanciaId, contaId) {
  const { data: existing } = await supabase
    .from("leads_jornada_etapas")
    .select("id")
    .eq("instancia_id", instanciaId)
    .eq("primeiro_contato", true)
    .maybeSingle();

  if (existing?.id) return existing;

  const { data, error } = await supabase
    .from("leads_jornada_etapas")
    .insert({
      conta_id: contaId,
      instancia_id: instanciaId,
      nome: "Contato Inicial",
      posicao: 1,
      palavras_chave: [],
      evento_meta: "",
      primeiro_contato: true,
      representa_venda: false,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export async function getEtapasForInstancia(supabase, instanciaId) {
  const { data, error } = await supabase
    .from("leads_jornada_etapas")
    .select("*")
    .eq("instancia_id", instanciaId)
    .order("posicao", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * @param {object[]} etapas
 * @param {string} messageText
 * @param {{ isFirstMessage?: boolean }} opts
 */
export function resolveEtapaFromMessage(etapas, messageText, { isFirstMessage = false } = {}) {
  const { etapa } = debugResolveEtapaFromMessage(etapas, messageText, { isFirstMessage });
  return etapa;
}

/**
 * Mesma lógica de resolveEtapaFromMessage, com detalhes para debug em logs.
 */
export function debugResolveEtapaFromMessage(
  etapas,
  messageText,
  { isFirstMessage = false, matchKeywords = true } = {}
) {
  const textoVisivel = stripInvisibleChars(messageText).trim();
  const tentativas = [];

  if (!etapas?.length) {
    return { etapa: null, textoVisivel, tentativas, motivo: "sem_etapas" };
  }

  if (!matchKeywords) {
    if (isFirstMessage) {
      const inicial = etapas.find((e) => e.primeiro_contato);
      if (inicial) {
        return { etapa: inicial, textoVisivel, tentativas, motivo: "primeiro_contato" };
      }
    }
    return { etapa: null, textoVisivel, tentativas, motivo: "nenhum_match" };
  }

  const comPalavras = etapas
    .filter((e) => {
      if (e.primeiro_contato) return false;
      const kws = parsePalavrasChave(e.palavras_chave);
      return kws.length > 0;
    })
    .sort((a, b) => (b.posicao ?? 0) - (a.posicao ?? 0));

  for (const etapa of comPalavras) {
    const kws = parsePalavrasChave(etapa.palavras_chave);
    for (const palavra of kws) {
      const matched = messageMatchesKeyword(textoVisivel, palavra);
      tentativas.push({
        etapaId: etapa.id,
        etapaNome: etapa.nome,
        palavra,
        matched,
      });
      if (matched) {
        return { etapa, textoVisivel, tentativas, motivo: "palavra_chave" };
      }
    }
  }

  if (isFirstMessage) {
    const inicial = etapas.find((e) => e.primeiro_contato);
    if (inicial) {
      return { etapa: inicial, textoVisivel, tentativas, motivo: "primeiro_contato" };
    }
  }

  return { etapa: null, textoVisivel, tentativas, motivo: "nenhum_match" };
}

export async function getFunnelCounts(supabase, instanciaId) {
  const { data: links } = await supabase
    .from("leads_links")
    .select("id")
    .eq("instancia_id", instanciaId);

  const linkIds = (links ?? []).map((l) => l.id);

  let query = supabase.from("leads_cliques").select("etapa_id").not("etapa_id", "is", null);

  if (linkIds.length > 0) {
    query = query.or(
      `link_id.in.(${linkIds.join(",")}),and(instancia_id.eq.${instanciaId},link_id.is.null)`
    );
  } else {
    query = query.eq("instancia_id", instanciaId).is("link_id", null);
  }

  const { data: cliques } = await query;

  const counts = {};
  for (const c of cliques ?? []) {
    if (c.etapa_id) counts[c.etapa_id] = (counts[c.etapa_id] ?? 0) + 1;
  }
  return counts;
}
