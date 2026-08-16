import {
  decodeTrackingIdFromMessage,
  decodeTrackingIdLoose,
  stripInvisibleChars,
} from "./leadTrackingCodec.js";
import { generateTrackingId, onlyDigits, phonesMatch } from "./leadsUtils.js";

const CLIQUE_SELECT =
  "*, leads_links(id, slug, nome, mensagem_inicial, instancia_id)";

function attachChat(item, chat) {
  if (!item || typeof item !== "object") return item;
  if (item.chat) return item;
  if (chat && typeof chat === "object") return { ...item, chat };
  return item;
}

/**
 * Extrai lista de mensagens do payload UAZAPI (e fallback Evolution).
 */
function pickInstanceName(body) {
  const nested = body?.instance && typeof body.instance === "object" ? body.instance : null;
  const candidates = [
    body?.instanceName,
    typeof body?.instance === "string" ? body.instance : null,
    nested?.instanceName,
    nested?.name,
    nested?.id,
  ];
  for (const raw of candidates) {
    const s = String(raw ?? "").trim();
    if (s && s !== "[object Object]") return s;
  }
  return "";
}

export function extractEvolutionMessages(body) {
  const event = String(body?.EventType ?? body?.event ?? body?.type ?? "").toLowerCase();
  const instance = pickInstanceName(body);
  const chat = body?.chat ?? null;

  const messages = [];

  if (body?.message && typeof body.message === "object" && !Array.isArray(body.message)) {
    messages.push(attachChat(body.message, chat));
  }

  const roots = [];
  if (body?.data != null) roots.push(body.data);
  if (Array.isArray(body?.messages)) roots.push(...body.messages);

  for (const root of roots) {
    if (Array.isArray(root)) {
      messages.push(...root.map((m) => attachChat(m, chat)));
    } else if (root?.messages && Array.isArray(root.messages)) {
      messages.push(...root.messages.map((m) => attachChat(m, chat)));
    } else if (root && typeof root === "object" && (root.key || root.message || root.chatid || root.messageid)) {
      if (root.message && typeof root.message === "object" && (root.message.chatid || root.message.fromMe != null)) {
        messages.push(attachChat(root.message, root.chat ?? chat));
      } else {
        messages.push(attachChat(root, root.chat ?? chat));
      }
    }
  }

  return { event, instance, messages, owner: body?.owner ?? null };
}

export function isConnectionEvent(event) {
  return String(event ?? "").toLowerCase() === "connection";
}

/** Direção da mensagem no payload UAZAPI / Evolution. */
export function getWebhookMessageDirection(item) {
  const uazRoot =
    item?.chatid || item?.messageid || item?.fromMe === true || item?.fromMe === false
      ? item
      : null;
  const root = uazRoot ?? (item?.key ? item : item?.message ?? item?.data ?? item);
  const chat = item?.chat ?? {};
  const chatid = String(root?.chatid ?? chat.wa_chatid ?? item?.chatid ?? item?.key?.remoteJid ?? "");
  if (root?.isGroup === true || chat.wa_isGroup === true) return "grupo";
  if (chatid.includes("@g.us")) return "grupo";
  if (chatid.includes("@broadcast")) return "broadcast";
  const fromMe = root?.fromMe ?? item?.fromMe ?? item?.key?.fromMe ?? item?.data?.key?.fromMe;
  if (fromMe === true) return "enviada_pela_instancia";
  if (fromMe === false) return "recebida_do_lead";
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
  const fromMe = item?.fromMe ?? key.fromMe ?? null;
  return {
    direction,
    fromMe,
    status: item?.status ?? item?.data?.status ?? null,
    addressingMode: key.addressingMode ?? null,
    remoteJid: item?.chatid ?? key.remoteJid ?? item?.remoteJid ?? null,
    remoteJidAlt: item?.sender_pn ?? key.remoteJidAlt ?? null,
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

const INSTANCIA_LOOKUP_SELECT =
  "id, instance_name, nome, token_instancia, conta_id, id_externo";

/** Resolve instância por nome, id_externo (UUID UAZAPI) ou token. */
export async function findLeadsInstancia(supabase, { instanceName, token } = {}) {
  const name = String(instanceName ?? "").trim();
  const tok = String(token ?? "").trim();

  if (name) {
    const byName = await supabase
      .from("leads_instancias_whatsapp")
      .select(INSTANCIA_LOOKUP_SELECT)
      .eq("instance_name", name)
      .maybeSingle();
    if (byName.data) return byName.data;

    const byExterno = await supabase
      .from("leads_instancias_whatsapp")
      .select(INSTANCIA_LOOKUP_SELECT)
      .eq("id_externo", name)
      .maybeSingle();
    if (byExterno.data) return byExterno.data;
  }

  if (tok) {
    const byToken = await supabase
      .from("leads_instancias_whatsapp")
      .select(INSTANCIA_LOOKUP_SELECT)
      .eq("token_instancia", tok)
      .maybeSingle();
    if (byToken.data) return byToken.data;
  }

  return null;
}

async function getInstanceContext(supabase, instanceName) {
  const inst = await findLeadsInstancia(supabase, { instanceName });

  if (!inst?.id) return null;

  const { data: links } = await supabase.from("leads_links").select("id").eq("instancia_id", inst.id);
  const linkIds = (links ?? []).map((l) => l.id);
  return { instanciaId: inst.id, contaId: inst.conta_id, linkIds };
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
    conta_id: ctx.contaId,
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
      const ctx = instanceName ? await getInstanceContext(supabase, instanceName) : null;
      const cliqueInst = clique.instancia_id ?? clique.leads_links?.instancia_id ?? null;
      if (!ctx?.instanciaId || !cliqueInst || cliqueInst === ctx.instanciaId) {
        return { clique, trackingId, matchMethod: "invisible_id" };
      }
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
