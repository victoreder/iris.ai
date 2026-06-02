const META_OAUTH_VERSION = "v25.0";
const META_OAUTH_CALLBACK_PATH = "/auth/meta/callback";
const META_OAUTH_STORAGE = {
  nonce: "meta_oauth_nonce",
  contaId: "meta_oauth_conta_id",
  returnTo: "meta_oauth_return",
} as const;

type MetaOAuthStatePayload = {
  n: string;
  c: string;
  r: string;
};

function writeMetaOAuthStorage(payload: MetaOAuthStatePayload): void {
  localStorage.setItem(META_OAUTH_STORAGE.nonce, payload.n);
  localStorage.setItem(META_OAUTH_STORAGE.contaId, payload.c);
  localStorage.setItem(META_OAUTH_STORAGE.returnTo, payload.r);
}

function encodeMetaOAuthState(payload: MetaOAuthStatePayload): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeMetaOAuthState(state: string): MetaOAuthStatePayload | null {
  try {
    const padded = state.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const json = atob(padded + "=".repeat(padLen));
    const data = JSON.parse(json) as Partial<MetaOAuthStatePayload>;
    if (!data.n || !data.c) return null;
    return { n: data.n, c: data.c, r: data.r ?? "/app" };
  } catch {
    return null;
  }
}

export function getMetaAppId(): string {
  return (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? "";
}

export function getMetaLoginConfigId(): string {
  return (import.meta.env.VITE_META_LOGIN_CONFIG_ID as string | undefined)?.trim() ?? "";
}

export function normalizeMetaOAuthRedirectUri(uri: string): string {
  return uri.trim().replace(/\/+$/, "");
}

/** URI exata cadastrada no Meta Developer → Facebook Login → URIs de redirecionamento OAuth. */
export function getMetaOAuthRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${normalizeMetaOAuthRedirectUri(window.location.origin)}${META_OAUTH_CALLBACK_PATH}`;
  }

  const explicit = (import.meta.env.VITE_META_OAUTH_REDIRECT_URI as string | undefined)?.trim();
  if (explicit) return normalizeMetaOAuthRedirectUri(explicit);

  const base =
    (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim() || "http://localhost:5175";

  return `${normalizeMetaOAuthRedirectUri(base)}${META_OAUTH_CALLBACK_PATH}`;
}

export function clearMetaOAuthSession(): void {
  localStorage.removeItem(META_OAUTH_STORAGE.nonce);
  localStorage.removeItem(META_OAUTH_STORAGE.contaId);
  localStorage.removeItem(META_OAUTH_STORAGE.returnTo);
}

export function readMetaOAuthSession(stateParam?: string | null) {
  const fromState = stateParam ? decodeMetaOAuthState(stateParam) : null;
  if (fromState) {
    return {
      nonce: fromState.n,
      contaId: fromState.c,
      returnTo: fromState.r,
    };
  }

  return {
    nonce: localStorage.getItem(META_OAUTH_STORAGE.nonce),
    contaId: localStorage.getItem(META_OAUTH_STORAGE.contaId),
    returnTo: localStorage.getItem(META_OAUTH_STORAGE.returnTo),
  };
}

export function buildMetaOAuthUrl(contaId: string, returnTo: string): string {
  const appId = getMetaAppId();
  if (!appId) throw new Error("VITE_META_APP_ID não configurado.");

  const redirectUri = getMetaOAuthRedirectUri();
  const configId = getMetaLoginConfigId();
  const nonce = crypto.randomUUID();
  const oauthState = encodeMetaOAuthState({ n: nonce, c: contaId, r: returnTo });
  writeMetaOAuthStorage({ n: nonce, c: contaId, r: returnTo });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: oauthState,
  });

  if (configId) {
    params.set("config_id", configId);
  } else {
    params.set("scope", "ads_read");
  }

  return `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${params.toString()}`;
}

/** Abre login Meta em nova guia; se bloqueado, redireciona a aba atual. */
export function startMetaOAuthNewTab(contaId: string, returnTo: string): void {
  const url = buildMetaOAuthUrl(contaId, returnTo);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
}
