const { EVOLUTION_API_URL, EVOLUTION_API_KEY, BACKEND_PUBLIC_URL } = process.env;

function getEvolutionBase() {
  const base = String(EVOLUTION_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Configure EVOLUTION_API_URL no ambiente.");
  return base;
}

function getEvolutionKey() {
  const key = String(EVOLUTION_API_KEY ?? "").trim();
  if (!key) throw new Error("Configure EVOLUTION_API_KEY no ambiente.");
  return key;
}

export function getLeadsWebhookUrl() {
  const base = String(BACKEND_PUBLIC_URL ?? process.env.VITE_BACKEND_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!base) {
    throw new Error("Configure BACKEND_PUBLIC_URL no ambiente.");
  }
  return `${base}/api/leads/webhook-evolution`;
}

async function evolutionFetch(path, options = {}) {
  const url = `${getEvolutionBase()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: getEvolutionKey(),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      (Array.isArray(data?.response?.message)
        ? data.response.message.join(", ")
        : null) ||
      text ||
      `Evolution HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function evolutionCreateInstance(instanceName) {
  return evolutionFetch("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
}

export async function evolutionConnectInstance(instanceName) {
  return evolutionFetch(`/instance/connect/${encodeURIComponent(instanceName)}`, {
    method: "GET",
  });
}

export async function evolutionConnectionState(instanceName) {
  return evolutionFetch(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    { method: "GET" }
  );
}

export async function evolutionFetchInstances(instanceName) {
  const query = instanceName
    ? `?instanceName=${encodeURIComponent(instanceName)}`
    : "";
  return evolutionFetch(`/instance/fetchInstances${query}`, { method: "GET" });
}

/**
 * Extrai telefone (somente dígitos) de respostas variadas da Evolution API v2.
 * @param {unknown} data
 * @returns {string | null}
 */
export function extractPhoneFromEvolutionData(data) {
  if (!data || typeof data !== "object") return null;

  const candidates = [];

  const push = (v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) candidates.push(s);
  };

  const inst = data.instance ?? data;
  push(inst.owner);
  push(inst.wuid);
  push(inst.ownerJid);
  push(inst.number);
  push(inst.phone);
  push(data.owner);
  push(data.wuid);
  push(data.ownerJid);
  push(data.number);

  if (Array.isArray(data)) {
    for (const item of data) {
      const p = extractPhoneFromEvolutionData(item);
      if (p) candidates.push(p);
    }
  }

  for (const raw of candidates) {
    const phone = jidToPhone(raw.includes("@") ? raw : `${raw}@s.whatsapp.net`);
    if (phone.length >= 10) return phone;
  }

  return null;
}

/**
 * Busca telefone da instância conectada na Evolution (connectionState + fetchInstances).
 * @param {string} instanceName
 * @returns {Promise<{ connected: boolean, state: string, telefone: string | null }>}
 */
export async function resolveInstancePhone(instanceName) {
  const name = String(instanceName ?? "").trim();
  if (!name) return { connected: false, state: "", telefone: null };

  let state = "";
  let telefone = null;

  try {
    const stateData = await evolutionConnectionState(name);
    state =
      stateData?.instance?.state ||
      stateData?.state ||
      stateData?.connectionStatus?.state ||
      stateData?.connectionStatus ||
      "";

    telefone = extractPhoneFromEvolutionData(stateData);
  } catch (e) {
    console.warn("resolveInstancePhone connectionState:", e?.message);
  }

  if (!telefone) {
    try {
      const list = await evolutionFetchInstances(name);
      const items = Array.isArray(list) ? list : list?.instances ?? [list];
      for (const item of items) {
        const itemName =
          item?.instance?.instanceName ??
          item?.instanceName ??
          item?.name ??
          "";
        if (itemName && itemName !== name) continue;
        const p = extractPhoneFromEvolutionData(item);
        if (p) {
          telefone = p;
          break;
        }
      }
      if (!telefone) {
        telefone = extractPhoneFromEvolutionData(list);
      }
    } catch (e) {
      console.warn("resolveInstancePhone fetchInstances:", e?.message);
    }
  }

  const connected = /open|connected/i.test(String(state)) || Boolean(telefone);

  return {
    connected,
    state: String(state),
    telefone,
  };
}

export async function evolutionSetWebhook(instanceName) {
  const webhookUrl = getLeadsWebhookUrl();
  const body = {
    webhook: {
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      events: ["MESSAGES_UPSERT"],
    },
  };

  try {
    return await evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch (e) {
    return evolutionFetch(`/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        events: ["MESSAGES_UPSERT"],
      }),
    });
  }
}

/** Extrai texto de mensagem Evolution/Baileys. */
export function extractMessageText(messageData) {
  if (typeof messageData === "string") return messageData;

  const msg = messageData?.message ?? messageData;
  if (!msg || typeof msg !== "object") return "";

  if (typeof msg.conversation === "string") return msg.conversation;
  if (msg.extendedTextMessage?.text) return String(msg.extendedTextMessage.text);
  if (msg.ephemeralMessage?.message) {
    return extractMessageText(msg.ephemeralMessage.message);
  }
  if (msg.viewOnceMessage?.message) {
    return extractMessageText(msg.viewOnceMessage.message);
  }
  if (msg.viewOnceMessageV2?.message) {
    return extractMessageText(msg.viewOnceMessageV2.message);
  }
  if (msg.buttonsResponseMessage?.selectedDisplayText) {
    return String(msg.buttonsResponseMessage.selectedDisplayText);
  }
  if (msg.buttonsResponseMessage?.selectedButtonId) {
    return String(msg.buttonsResponseMessage.selectedButtonId);
  }
  if (msg.listResponseMessage?.title) {
    return String(msg.listResponseMessage.title);
  }
  if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
    return String(msg.listResponseMessage.singleSelectReply.selectedRowId);
  }
  if (msg.templateButtonReplyMessage?.selectedDisplayText) {
    return String(msg.templateButtonReplyMessage.selectedDisplayText);
  }
  if (msg.imageMessage?.caption) return String(msg.imageMessage.caption);
  if (msg.videoMessage?.caption) return String(msg.videoMessage.caption);
  if (msg.documentMessage?.caption) return String(msg.documentMessage.caption);

  return "";
}

/** Extrai texto do item completo do webhook (vários formatos Evolution v2). */
export function extractMessageTextFromWebhookItem(item) {
  const parts = [
    extractMessageText(item),
    extractMessageText(item?.message),
    extractMessageText(item?.data),
    typeof item?.data?.message === "string" ? item.data.message : "",
    item?.data?.message?.conversation,
    item?.message?.conversation,
    item?.data?.text?.body,
    item?.message?.text?.body,
    item?.data?.body,
    item?.message?.body,
    typeof item?.text === "string" ? item.text : "",
    typeof item?.body === "string" ? item.body : "",
  ];
  for (const p of parts) {
    const s = String(p ?? "").trim();
    if (s) return s;
  }
  return "";
}

function isWhatsAppPhoneJid(jid) {
  const j = String(jid ?? "").toLowerCase();
  return j.includes("@s.whatsapp.net") || j.includes("@c.us") || j.includes("@whatsapp.net");
}

/** JID do remetente (suporta @lid com participant / remoteJidAlt). */
export function extractSenderJid(item) {
  const key = item?.key ?? item?.data?.key ?? {};
  const participant = key.participant || item?.participant || item?.data?.participant;
  const remoteJidAlt = key.remoteJidAlt || item?.remoteJidAlt;
  const remoteJid = key.remoteJid || item?.remoteJid || item?.data?.remoteJid || "";

  if (participant && isWhatsAppPhoneJid(participant)) return participant;
  if (remoteJidAlt && isWhatsAppPhoneJid(remoteJidAlt)) return remoteJidAlt;
  if (isWhatsAppPhoneJid(remoteJid)) return remoteJid;
  if (participant) return participant;
  return remoteJid || null;
}

/** Telefone do remetente a partir do remoteJid (ou participant/remoteJidAlt). */
export function jidToPhone(remoteJid) {
  const jid = String(remoteJid ?? "");
  if (!jid || jid.includes("@g.us")) return "";
  if (jid.includes("@lid")) return "";
  const part = jid.split("@")[0] || "";
  const digits = part.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

/** Telefone a partir do item completo do webhook (key com @lid + remoteJidAlt). */
export function phoneFromWebhookItem(item) {
  const jid = extractSenderJid(item);
  const fromJid = jidToPhone(jid);
  if (fromJid) return fromJid;

  const key = item?.key ?? item?.data?.key ?? {};
  const alt = key.remoteJidAlt || item?.remoteJidAlt;
  if (alt) return jidToPhone(alt);

  const participant = key.participant || item?.participant;
  if (participant) return jidToPhone(participant);

  return "";
}
