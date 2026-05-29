import {
  decodeTrackingIdFromMessage,
  decodeTrackingIdLoose,
  stripInvisibleChars,
} from "./leadTrackingCodec.js";
import { generateTrackingId, onlyDigits, phonesMatch } from "./leadsUtils.js";

const CLIQUE_SELECT =
  "*, leads_links(id, slug, nome, mensagem_inicial, instancia_id)";

/**
 * Extrai lista de mensagens do payload Evolution (vários formatos v1/v2).
 */
export function extractEvolutionMessages(body) {
  const event = String(body?.event ?? body?.type ?? "").toLowerCase();
  const instance = body?.instance ?? body?.instanceName ?? body?.instance?.instanceName ?? null;

  const roots = [];
  if (body?.data != null) roots.push(body.data);
  if (body?.message != null) roots.push(body);
  if (Array.isArray(body?.messages)) roots.push(...body.messages);

  const messages = [];
  for (const root of roots) {
    if (Array.isArray(root)) {
      messages.push(...root);
    } else if (root?.messages && Array.isArray(root.messages)) {
      messages.push(...root.messages);
    } else if (root?.key || root?.message) {
      messages.push(root);
    }
  }

  return { event, instance, messages };
}

/** Direção da mensagem no payload Evolution/Baileys. */
export function getWebhookMessageDirection(item) {
  const key = item?.key ?? item?.data?.key ?? {};
  const jid = String(key.remoteJid ?? item?.remoteJid ?? "");
  if (jid.includes("@g.us")) return "grupo";
  if (jid.includes("@broadcast")) return "broadcast";
  if (key.fromMe === true) return "enviada_pela_instancia";
  if (key.fromMe === false) return "recebida_do_lead";
  return "desconhecida";
}

export function isIncomingMessage(item) {
  return getWebhookMessageDirection(item) === "recebida_do_lead";
}

export function isOutgoingFromInstance(item) {
  return getWebhookMessageDirection(item) === "enviada_pela_instancia";
}

/** Mensagem usada na jornada: entrada do lead ou envio da instância (palavras-chave). */
export function isJornadaWebhookMessage(item) {
  const d = getWebhookMessageDirection(item);
  return d === "recebida_do_lead" || d === "enviada_pela_instancia";
}

/** Resumo para logs do webhook (direção, texto, JID). */
export function summarizeWebhookMessage(item, extractText) {
  const key = item?.key ?? item?.data?.key ?? {};
  const direction = getWebhookMessageDirection(item);
  const text = typeof extractText === "function" ? extractText(item) : "";
  return {
    direction,
    fromMe: key.fromMe ?? null,
    status: item?.status ?? item?.data?.status ?? null,
    addressingMode: key.addressingMode ?? null,
    remoteJid: key.remoteJid ?? item?.remoteJid ?? null,
    remoteJidAlt: key.remoteJidAlt ?? null,
    textoExtraido: text ? String(text).trim().slice(0, 120) : "",
    processavelParaJornada: isJornadaWebhookMessage(item),
    usoJornada:
      direction === "enviada_pela_instancia"
        ? "mudanca_etapa"
        : direction === "recebida_do_lead"
          ? "primeiro_contato_lead"
          : null,
  };
}

export { extractSenderJid } from "./evolutionLeads.js";

async function getInstanceContext(supabase, instanceName) {
  const { data: inst } = await supabase
    .from("leads_instancias_whatsapp")
    .select("id")
    .eq("instance_name", String(instanceName).trim())
    .maybeSingle();

  if (!inst?.id) return null;

  const { data: links } = await supabase.from("leads_links").select("id").eq("instancia_id", inst.id);
  const linkIds = (links ?? []).map((l) => l.id);
  return { instanciaId: inst.id, linkIds };
}

/** Filtra cliques da instância (via link ou WhatsApp direto sem link). */
function filterCliquesByInstance(query, { instanciaId, linkIds }) {
  if (linkIds.length > 0) {
    return query.or(
      `link_id.in.(${linkIds.join(",")}),and(instancia_id.eq.${instanciaId},link_id.is.null)`
    );
  }
  return query.eq("instancia_id", instanciaId).is("link_id", null);
}

async function fetchCliqueById(supabase, trackingId) {
  const { data: clique, error } = await supabase
    .from("leads_cliques")
    .select(CLIQUE_SELECT)
    .eq("id", trackingId)
    .maybeSingle();
  if (error || !clique) return null;
  return clique;
}

/**
 * Localiza lead convertido pelo telefone (mensagens sem tracking id na 2ª mensagem em diante).
 */
async function resolveCliqueByPhone(supabase, { telefone, instanceName, status = "convertido" }) {
  if (!telefone?.trim() || !instanceName) {
    return { clique: null, trackingId: null, matchMethod: null };
  }

  const ctx = await getInstanceContext(supabase, instanceName);
  if (!ctx) return { clique: null, trackingId: null, matchMethod: null };

  const digits = onlyDigits(telefone);
  const tail = digits.length >= 11 ? digits.slice(-11) : digits.slice(-10);
  const since =
    status === "aguardando"
      ? new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = filterCliquesByInstance(
    supabase.from("leads_cliques").select(CLIQUE_SELECT).eq("status", status),
    ctx
  )
    .order(status === "aguardando" ? "created_at" : "convertido_at", { ascending: false })
    .limit(80);

  if (status === "convertido") {
    query = query.gte("convertido_at", since);
  } else {
    query = query.gte("created_at", since);
  }

  if (tail.length >= 8) {
    query = query.or(`telefone_lead.ilike.%${tail}%,telefone_lead.ilike.%${digits}%`);
  }

  const { data: candidatos, error } = await query;

  if (error) {
    console.error("resolveCliqueByPhone:", error.message);
    return { clique: null, trackingId: null, matchMethod: null };
  }

  for (const c of candidatos ?? []) {
    if (phonesMatch(telefone, c.telefone_lead)) {
      return { clique: c, trackingId: c.id, matchMethod: "telefone" };
    }
  }

  if (tail.length >= 8) {
    for (const c of candidatos ?? []) {
      const leadDigits = onlyDigits(c.telefone_lead);
      if (leadDigits && (leadDigits.endsWith(tail) || tail.endsWith(leadDigits.slice(-10)))) {
        return { clique: c, trackingId: c.id, matchMethod: "telefone_parcial" };
      }
    }
  }

  return { clique: null, trackingId: null, matchMethod: null };
}

/**
 * Cria lead sem clique no link (WhatsApp direto) para aparecer na listagem.
 */
export async function createDirectWhatsAppLead(supabase, { telefone, instanceName, text }) {
  if (!telefone?.trim() || !instanceName) return null;

  const existingConvertido = await resolveCliqueByPhone(supabase, {
    telefone,
    instanceName,
    status: "convertido",
  });
  if (existingConvertido.clique) return existingConvertido;

  const existingAguardando = await resolveCliqueByPhone(supabase, {
    telefone,
    instanceName,
    status: "aguardando",
  });
  if (existingAguardando.clique) return existingAguardando;

  const ctx = await getInstanceContext(supabase, instanceName);
  if (!ctx) return null;

  const trackingId = generateTrackingId();
  const row = {
    id: trackingId,
    link_id: null,
    instancia_id: ctx.instanciaId,
    status: "aguardando",
    telefone_lead: telefone,
    mensagem_recebida: text?.trim() ? String(text).trim().slice(0, 2000) : null,
  };

  const { data: inserted, error } = await supabase
    .from("leads_cliques")
    .insert(row)
    .select(CLIQUE_SELECT)
    .maybeSingle();

  if (error || !inserted) {
    console.error("createDirectWhatsAppLead:", error?.message);
    return null;
  }

  return {
    clique: { ...inserted, leads_links: null },
    trackingId,
    matchMethod: "whatsapp_direto",
  };
}

export async function resolveCliqueFromMessage(supabase, { text, instanceName, telefone }) {
  const rawText = String(text ?? "");
  const visibleText = stripInvisibleChars(rawText).trim();

  let trackingId =
    decodeTrackingIdFromMessage(rawText) || decodeTrackingIdLoose(rawText);

  if (trackingId) {
    const clique = await fetchCliqueById(supabase, trackingId);
    if (clique) {
      return { clique, trackingId, matchMethod: "invisible_id" };
    }
    trackingId = null;
  }

  if (telefone && instanceName) {
    const byPhone = await resolveCliqueByPhone(supabase, { telefone, instanceName, status: "convertido" });
    if (byPhone.clique) return byPhone;

    const byPhoneAguardando = await resolveCliqueByPhone(supabase, {
      telefone,
      instanceName,
      status: "aguardando",
    });
    if (byPhoneAguardando.clique) {
      return { ...byPhoneAguardando, matchMethod: "telefone_aguardando" };
    }
  }

  if (!visibleText) {
    return { clique: null, trackingId: null, matchMethod: null };
  }

  const ctx = instanceName ? await getInstanceContext(supabase, instanceName) : null;
  if (instanceName && !ctx) {
    return { clique: null, trackingId: null, matchMethod: null };
  }

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("leads_cliques")
    .select(CLIQUE_SELECT)
    .eq("status", "aguardando")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(30);

  if (ctx) {
    query = filterCliquesByInstance(query, ctx);
  }

  const { data: candidatos, error: errList } = await query;
  if (!errList && candidatos?.length) {
    const visibleLower = visibleText.toLowerCase();
    for (const c of candidatos) {
      const expected = stripInvisibleChars(c.leads_links?.mensagem_inicial ?? "")
        .trim()
        .toLowerCase();
      if (!expected) continue;

      if (
        visibleLower === expected ||
        visibleLower.startsWith(expected) ||
        expected.startsWith(visibleLower)
      ) {
        return { clique: c, trackingId: c.id, matchMethod: "mensagem_visivel" };
      }
    }
  }

  if (telefone && instanceName) {
    const byPhone = await resolveCliqueByPhone(supabase, { telefone, instanceName, status: "convertido" });
    if (byPhone.clique) return byPhone;

    const byPhoneAguardando = await resolveCliqueByPhone(supabase, {
      telefone,
      instanceName,
      status: "aguardando",
    });
    if (byPhoneAguardando.clique) {
      return { ...byPhoneAguardando, matchMethod: "telefone_aguardando" };
    }
  }

  return { clique: null, trackingId: null, matchMethod: null };
}
