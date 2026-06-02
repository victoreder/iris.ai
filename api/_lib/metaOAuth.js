const META_GRAPH_VERSION = "v25.0";
const META_OAUTH_CALLBACK_PATH = "/auth/meta/callback";

function normalizeMetaOAuthRedirectUri(uri) {
  return String(uri ?? "").trim().replace(/\/+$/, "");
}

/** URIs OAuth permitidas (mesma lista cadastrada no Meta Developer). */
export function getConfiguredMetaOAuthRedirectUris() {
  const uris = new Set();
  for (const value of [
    process.env.META_OAUTH_REDIRECT_URI,
    process.env.VITE_META_OAUTH_REDIRECT_URI,
  ]) {
    const normalized = normalizeMetaOAuthRedirectUri(value);
    if (normalized) uris.add(normalized);
  }
  for (const base of [process.env.VITE_APP_PUBLIC_URL, process.env.APP_PUBLIC_URL]) {
    const normalized = normalizeMetaOAuthRedirectUri(base);
    if (normalized) uris.add(`${normalized}${META_OAUTH_CALLBACK_PATH}`);
  }
  uris.add(`http://localhost:5175${META_OAUTH_CALLBACK_PATH}`);
  uris.add(`https://app.viziom.ia.br${META_OAUTH_CALLBACK_PATH}`);
  return [...uris];
}

export function getPrimaryMetaOAuthRedirectUri() {
  const explicit = normalizeMetaOAuthRedirectUri(process.env.META_OAUTH_REDIRECT_URI);
  if (explicit) return explicit;
  const fromVite = normalizeMetaOAuthRedirectUri(process.env.VITE_META_OAUTH_REDIRECT_URI);
  if (fromVite) return fromVite;
  const base = normalizeMetaOAuthRedirectUri(
    process.env.VITE_APP_PUBLIC_URL || process.env.APP_PUBLIC_URL || "http://localhost:5175"
  );
  return `${base}${META_OAUTH_CALLBACK_PATH}`;
}

function getMetaAppCredentials() {
  const appId =
    (process.env.META_APP_ID || process.env.VITE_META_APP_ID || "").trim();
  const appSecret = (process.env.META_APP_SECRET || "").trim();
  if (!appId || !appSecret) {
    throw new Error("Configure META_APP_ID e META_APP_SECRET no ambiente.");
  }
  return { appId, appSecret };
}

async function graphGet(path, accessToken, params = {}) {
  const qs = new URLSearchParams({
    ...params,
    access_token: accessToken,
  });
  const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Meta API HTTP ${res.status}`);
  }
  return body;
}

/** Valida redirect_uri usado no fluxo OAuth code. */
export function assertMetaOAuthRedirectUri(redirectUri) {
  const normalized = normalizeMetaOAuthRedirectUri(redirectUri);
  if (!normalized.endsWith(META_OAUTH_CALLBACK_PATH)) {
    throw new Error("redirect_uri inválido.");
  }
  const allowed = getConfiguredMetaOAuthRedirectUris();
  if (!allowed.includes(normalized)) {
    throw new Error(
      `redirect_uri não permitido (${normalized}). Configure META_OAUTH_REDIRECT_URI igual à URI cadastrada no Meta Developer.`
    );
  }
  return normalized;
}

/** Troca authorization code (response_type=code) por access token curto. */
export async function exchangeMetaAuthCode(code, redirectUri) {
  assertMetaOAuthRedirectUri(redirectUri);
  const { appId, appSecret } = getMetaAppCredentials();
  const qs = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code: String(code).trim(),
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${qs}`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Meta OAuth HTTP ${res.status}`);
  }
  const accessToken = String(body?.access_token ?? "").trim();
  if (!accessToken) throw new Error("Meta não retornou access token.");
  return {
    accessToken,
    expiresIn: Number(body?.expires_in ?? 0) || null,
  };
}

/** Troca token curto por token longo (~60 dias). */
export async function exchangeMetaShortLivedToken(shortLivedToken) {
  const { appId, appSecret } = getMetaAppCredentials();
  const qs = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?${qs}`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Meta OAuth HTTP ${res.status}`);
  }
  const accessToken = String(body?.access_token ?? "").trim();
  if (!accessToken) throw new Error("Meta não retornou access token.");
  return {
    accessToken,
    expiresIn: Number(body?.expires_in ?? 0) || null,
  };
}

/** Lista pixels acessíveis pelo token (ad accounts + owned pixels). */
export async function listMetaPixels(accessToken) {
  const pixels = new Map();

  try {
    const adAccounts = await graphGet("/me/adaccounts", accessToken, {
      fields: "ads_pixels{id,name}",
      limit: "50",
    });
    for (const account of adAccounts?.data ?? []) {
      for (const pixel of account?.ads_pixels?.data ?? []) {
        if (pixel?.id) pixels.set(String(pixel.id), String(pixel.name ?? pixel.id));
      }
    }
  } catch {
    // Algumas contas não expõem adaccounts; tentamos businesses abaixo.
  }

  try {
    const businesses = await graphGet("/me/businesses", accessToken, {
      fields: "owned_pixels{id,name}",
      limit: "50",
    });
    for (const business of businesses?.data ?? []) {
      for (const pixel of business?.owned_pixels?.data ?? []) {
        if (pixel?.id) pixels.set(String(pixel.id), String(pixel.name ?? pixel.id));
      }
    }
  } catch {
    // Sem permissão ou sem Business Manager vinculado.
  }

  return [...pixels.entries()].map(([id, name]) => ({ id, name }));
}
