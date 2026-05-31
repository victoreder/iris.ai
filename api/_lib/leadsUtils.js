import crypto from "crypto";

const TRACKING_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** @returns {string} 12 chars */
export function generateTrackingId() {
  const bytes = crypto.randomBytes(12);
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += TRACKING_CHARS[bytes[i] % TRACKING_CHARS.length];
  }
  return id;
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

/** Compara telefones (aceita DDI 55 e variações). */
export function phonesMatch(a, b) {
  const da = onlyDigits(a);
  const db = onlyDigits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tail = (d) => {
    if (d.length >= 12 && d.startsWith("55")) return d.slice(-11);
    if (d.length >= 11) return d.slice(-11);
    return d.slice(-10);
  };
  return tail(da) === tail(db);
}

/** Normaliza texto para match de palavra-chave (acentos, espaços, hífens). */
export function normalizeKeywordText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s_-]+/g, " ")
    .trim();
}

export function messageMatchesKeyword(messageText, keyword) {
  const msg = normalizeKeywordText(messageText);
  const kw = normalizeKeywordText(keyword);
  if (!kw || !msg) return false;
  if (msg.includes(kw)) return true;
  const kwCompact = kw.replace(/\s/g, "");
  const msgCompact = msg.replace(/\s/g, "");
  if (kwCompact.length >= 3 && msgCompact.includes(kwCompact)) return true;
  return false;
}

/** Telefone E.164 para wa.me (somente digitos, com DDI). */
export function formatPhoneForWaMe(telefone) {
  const digits = onlyDigits(telefone);
  if (!digits) return "";
  if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWaMeUrl(telefone, text) {
  const phone = formatPhoneForWaMe(telefone);
  if (!phone) return null;
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function slugifyLeadLink(input) {
  return (
    String(input ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || ""
  );
}

export function isValidLeadSlug(slug) {
  const s = String(slug ?? "");
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  ) {
    return true;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2;
}

export function generateLeadLinkSlug() {
  return crypto.randomUUID();
}

export async function ensureUniqueLeadLinkSlug(supabase) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateLeadLinkSlug();
    const { data } = await supabase
      .from("leads_links")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  throw new Error("Não foi possível gerar um slug único.");
}

export function buildInstanceName(input, fallbackNome) {
  const raw = String(input ?? "").trim() || String(fallbackNome ?? "").trim();
  return slugifyLeadLink(raw).replace(/-/g, "_");
}

export function isValidInstanceName(name) {
  return typeof name === "string" && name.length >= 2;
}

export async function ensureUniqueInstanceName(supabase, baseName) {
  let attempt = 0;
  while (attempt < 100) {
    const suffix = attempt === 0 ? "" : `_${attempt + 1}`;
    const maxBase = Math.max(2, 64 - suffix.length);
    const candidate = `${baseName.slice(0, maxBase)}${suffix}`;
    const { data } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id")
      .eq("instance_name", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
  }
  throw new Error("Não foi possível gerar um nome de instância único.");
}

export async function ensureUniqueLeadSlug(supabase, baseSlug) {
  let attempt = 0;
  while (attempt < 100) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data } = await supabase
      .from("leads_links")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
  }
  throw new Error("Não foi possível gerar um slug único.");
}

/** @param {string} ua */
export function parseUserAgent(ua) {
  const s = String(ua ?? "");
  let device_type = "desktop";
  if (/mobile|android|iphone|ipod/i.test(s)) device_type = "mobile";
  else if (/ipad|tablet/i.test(s)) device_type = "tablet";

  let browser = "unknown";
  if (/edg\//i.test(s)) browser = "Edge";
  else if (/chrome/i.test(s)) browser = "Chrome";
  else if (/safari/i.test(s)) browser = "Safari";
  else if (/firefox/i.test(s)) browser = "Firefox";

  let os = "unknown";
  if (/windows/i.test(s)) os = "Windows";
  else if (/mac os|macintosh/i.test(s)) os = "macOS";
  else if (/android/i.test(s)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(s)) os = "iOS";
  else if (/linux/i.test(s)) os = "Linux";

  return { device_type, browser, os };
}

export function corsLeads(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, apikey, Authorization");
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || null;
}
