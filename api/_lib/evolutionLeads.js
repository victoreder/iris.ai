const { UAZAPI_API_URL, UAZAPI_ADMIN_TOKEN, BACKEND_PUBLIC_URL } = process.env;

function getUazapiBase() {
  const base = String(UAZAPI_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Configure UAZAPI_API_URL no ambiente.");
  return base;
}

function getUazapiAdminToken() {
  const key = String(UAZAPI_ADMIN_TOKEN ?? "").trim();
  if (!key) throw new Error("Configure UAZAPI_ADMIN_TOKEN no ambiente.");
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

export function hasUazapiToken(inst) {
  return Boolean(String(inst?.token_instancia ?? "").trim());
}

function parseJsonSafe(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function errorMessageFromBody(data, text, status) {
  return (
    data?.message ||
    data?.error ||
    (Array.isArray(data?.response?.message) ? data.response.message.join(", ") : null) ||
    text ||
    `UAZAPI HTTP ${status}`
  );
}

async function uazapiFetch(path, { token, admin = false, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (admin) headers.admintoken = getUazapiAdminToken();
  else {
    const t = String(token ?? "").trim();
    if (!t) throw new Error("Token da instância UAZAPI ausente.");
    headers.token = t;
  }

  const res = await fetch(`${getUazapiBase()}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = parseJsonSafe(text);
  if (!res.ok) {
    const err = new Error(errorMessageFromBody(data, text, res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function pickInstanceFields(data) {
  const inst = data?.instance && typeof data.instance === "object" ? data.instance : data;
  return {
    raw: data,
    token: inst?.token ?? data?.token ?? null,
    id: inst?.id ?? data?.id ?? null,
    name: inst?.name ?? data?.name ?? null,
    status: inst?.status ?? data?.status ?? "",
    qrcode: inst?.qrcode ?? data?.qrcode ?? data?.base64 ?? data?.qrCode ?? null,
    paircode: inst?.paircode ?? data?.paircode ?? null,
    owner: inst?.owner ?? data?.owner ?? inst?.phone ?? data?.phone ?? null,
  };
}

export async function uazapiCreateInstance(instanceName) {
  const data = await uazapiFetch("/instance/init", {
    admin: true,
    method: "POST",
    body: { name: instanceName },
  });
  const parsed = pickInstanceFields(data);
  if (!parsed.token) {
    throw new Error("UAZAPI não retornou o token da instância.");
  }
  return parsed;
}

export async function uazapiFindInstanceByName(instanceName) {
  const name = String(instanceName ?? "").trim();
  if (!name) return null;
  try {
    const list = await uazapiFetch("/instance/all", { admin: true, method: "GET" });
    const items = Array.isArray(list)
      ? list
      : list?.instances ?? list?.data ?? list?.result ?? [];
    const found = (Array.isArray(items) ? items : []).find((item) => {
      const n = item?.name ?? item?.instanceName ?? item?.instance?.name ?? "";
      return String(n) === name;
    });
    return found ? pickInstanceFields(found) : null;
  } catch (e) {
    console.warn("uazapiFindInstanceByName:", e?.message);
    return null;
  }
}

export async function evolutionCreateInstance(instanceName) {
  try {
    return await uazapiCreateInstance(instanceName);
  } catch (e) {
    const existing = await uazapiFindInstanceByName(instanceName);
    if (existing?.token) {
      console.warn("criar-instancia: reutilizando instância UAZAPI existente:", instanceName);
      return existing;
    }
    throw e;
  }
}

export async function evolutionConnectInstance(token) {
  return uazapiFetch("/instance/connect", {
    token,
    method: "POST",
    body: { systemName: "Viziom" },
  });
}

export async function evolutionDeleteInstance(token) {
  return uazapiFetch("/instance", { token, method: "DELETE" });
}

export async function evolutionSetWebhook(token) {
  const body = {
    url: getLeadsWebhookUrl(),
    events: ["messages", "connection"],
    enabled: true,
    addUrlEvents: false,
    addUrlTypesMessages: false,
    excludeMessages: ["wasSentByApi", "isGroupYes"],
  };
  try {
    return await uazapiFetch("/webhook/set", { token, method: "POST", body });
  } catch (e) {
    return uazapiFetch("/webhook", { token, method: "POST", body });
  }
}

export function extractQrcodeFromUazapi(data) {
  const parsed = pickInstanceFields(data);
  const qr = parsed.qrcode;
  if (typeof qr === "string" && qr.trim()) return qr.trim();
  if (typeof data?.qrcode?.base64 === "string") return data.qrcode.base64;
  if (typeof data?.code === "string") return data.code;
  return null;
}

export function extractPhoneFromEvolutionData(data) {
  if (!data || typeof data !== "object") return null;
  const parsed = pickInstanceFields(data);
  const candidates = [parsed.owner, data.owner, data.phone, data.wuid, data.number];
  if (Array.isArray(data)) {
    for (const item of data) {
      const p = extractPhoneFromEvolutionData(item);
      if (p) return p;
    }
  }
  for (const raw of candidates) {
    if (raw == null) continue;
    const s = String(raw).trim();
    const phone = jidToPhone(s.includes("@") ? s : `${s}@s.whatsapp.net`);
    if (phone.length >= 10) return phone;
  }
  return null;
}

function mapUazapiConnectionStatus(status) {
  const s = String(status ?? "").toLowerCase();
  if (s === "connected" || s === "open") return { connected: true, iris: "conectado", state: s };
  if (s === "connecting") return { connected: false, iris: "conectando", state: s };
  if (s === "disconnected" || s === "hibernated" || s === "close") {
    return { connected: false, iris: "desconectado", state: s };
  }
  return { connected: false, iris: "conectando", state: s };
}

/**
 * @param {string} token
 * @returns {Promise<{ connected: boolean, state: string, statusIris: string, telefone: string | null, qrcode: string | null }>}
 */
export async function resolveInstancePhone(token) {
  const t = String(token ?? "").trim();
  if (!t) {
    return { connected: false, state: "", statusIris: "desconectado", telefone: null, qrcode: null };
  }

  try {
    const data = await uazapiFetch("/instance/status", { token: t, method: "GET" });
    const parsed = pickInstanceFields(data);
    const mapped = mapUazapiConnectionStatus(parsed.status);
    const telefone = extractPhoneFromEvolutionData(data);
    const connected = mapped.connected;
    return {
      connected,
      state: mapped.state,
      statusIris: connected && telefone ? "conectado" : mapped.iris,
      telefone,
      qrcode: extractQrcodeFromUazapi(data),
    };
  } catch (e) {
    console.warn("resolveInstancePhone:", e?.message);
    return { connected: false, state: "", statusIris: "desconectado", telefone: null, qrcode: null };
  }
}

export async function persistUazapiCredenciais(supabase, instanciaId, { token, id }) {
  const updates = {
    token_instancia: token,
    updated_at: new Date().toISOString(),
  };
  if (id) updates.id_externo = String(id);
  const { data, error } = await supabase
    .from("leads_instancias_whatsapp")
    .update(updates)
    .eq("id", instanciaId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Instância só no banco (ex.: Evolution antiga): cria na UAZAPI, configura webhook e grava token.
 */
export async function ensureUazapiInstance(supabase, inst) {
  if (hasUazapiToken(inst)) return inst;

  const created = await evolutionCreateInstance(inst.instance_name);
  let webhookConfigurado = false;
  let webhookErro = null;
  try {
    await evolutionSetWebhook(created.token);
    webhookConfigurado = true;
  } catch (e) {
    webhookErro = e?.message ?? "Falha ao configurar webhook.";
    console.error("ensureUazapiInstance webhook:", e);
  }

  const { data, error } = await supabase
    .from("leads_instancias_whatsapp")
    .update({
      token_instancia: created.token,
      id_externo: created.id ? String(created.id) : inst.id_externo,
      webhook_configurado: webhookConfigurado,
      webhook_erro: webhookErro,
      status: "conectando",
      updated_at: new Date().toISOString(),
    })
    .eq("id", inst.id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Erro ao salvar credenciais UAZAPI.");
  }
  return data;
}

export async function fetchFreshQrcode(token) {
  const data = await evolutionConnectInstance(token);
  let qr = extractQrcodeFromUazapi(data);
  if (!qr) {
    try {
      const status = await uazapiFetch("/instance/status", { token, method: "GET" });
      qr = extractQrcodeFromUazapi(status);
    } catch (e) {
      console.warn("fetchFreshQrcode status:", e?.message);
    }
  }
  return qr;
}

function messageRoot(item) {
  if (!item || typeof item !== "object") return {};
  if (item.chatid || item.messageid || item.fromMe != null || item.mediaType) return item;
  return item.message ?? item.data ?? item;
}

function chatRoot(item) {
  if (!item || typeof item !== "object") return {};
  return item.chat ?? item.data?.chat ?? {};
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

/** Extrai texto do item completo do webhook (UAZAPI + Evolution). */
export function extractMessageTextFromWebhookItem(item) {
  const root = messageRoot(item);
  const content = root.content ?? item?.content;
  const parts = [
    typeof root.text === "string" ? root.text : "",
    typeof content === "string" ? content : "",
    typeof content?.caption === "string" ? content.caption : "",
    typeof root.buttonOrListid === "string" ? root.buttonOrListid : "",
    extractMessageText(item),
    extractMessageText(item?.message),
    extractMessageText(item?.data),
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

/** JID do lead (chat), nunca LID do sender. */
export function extractSenderJid(item) {
  const root = messageRoot(item);
  const chat = chatRoot(item);
  const chatid = root.chatid || chat.wa_chatid || item?.chatid;
  if (chatid && isWhatsAppPhoneJid(chatid)) return chatid;
  if (chatid && !String(chatid).includes("@lid")) return chatid;

  const key = item?.key ?? item?.data?.key ?? {};
  const participant = key.participant || item?.participant || item?.data?.participant;
  const remoteJidAlt = key.remoteJidAlt || item?.remoteJidAlt;
  const remoteJid = key.remoteJid || item?.remoteJid || item?.data?.remoteJid || "";

  if (participant && isWhatsAppPhoneJid(participant)) return participant;
  if (remoteJidAlt && isWhatsAppPhoneJid(remoteJidAlt)) return remoteJidAlt;
  if (isWhatsAppPhoneJid(remoteJid)) return remoteJid;
  if (chatid) return chatid;
  if (participant) return participant;
  return remoteJid || null;
}

export function jidToPhone(remoteJid) {
  const jid = String(remoteJid ?? "");
  if (!jid || jid.includes("@g.us")) return "";
  if (jid.includes("@lid")) return "";
  const part = jid.split("@")[0] || "";
  const digits = part.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

/** Telefone do lead: chatid / wa_chatid / chat.phone — nunca sender LID nem owner. */
export function phoneFromWebhookItem(item) {
  const root = messageRoot(item);
  const chat = chatRoot(item);
  const fromMe = root.fromMe === true || item?.fromMe === true;

  const fromChatid = jidToPhone(root.chatid || chat.wa_chatid || item?.chatid);
  if (fromChatid) return fromChatid;

  const fromChatPhone = String(chat.phone ?? "").replace(/\D/g, "");
  if (fromChatPhone.length >= 10 && fromChatPhone.length <= 15) return fromChatPhone;

  if (!fromMe) {
    const fromSenderPn = jidToPhone(root.sender_pn || item?.sender_pn);
    if (fromSenderPn) return fromSenderPn;
  }

  const jid = extractSenderJid(item);
  const fromJid = jidToPhone(jid);
  if (fromJid) return fromJid;

  const key = item?.key ?? item?.data?.key ?? {};
  const alt = key.remoteJidAlt || item?.remoteJidAlt;
  if (alt) return jidToPhone(alt);

  return "";
}
