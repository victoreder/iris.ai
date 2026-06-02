const META_OAUTH_VERSION = "v25.0";
const META_OAUTH_CALLBACK_PATH = "/auth/meta/callback";
const META_OAUTH_WINDOW_NAME = "viziom_meta_oauth";
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

export const META_OAUTH_MESSAGE = "viziom:meta-oauth" as const;

export type MetaOAuthMessage = {
  type: typeof META_OAUTH_MESSAGE;
  status: "success" | "error" | "cancelled";
  error?: string;
};

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

function metaOAuthWindowFeatures(): string {
  const width = 520;
  const height = 680;
  const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
  const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

  return [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "toolbar=no",
    "menubar=no",
    "location=yes",
    "status=no",
    "scrollbars=yes",
    "resizable=yes",
  ].join(",");
}

/** Abre janela vazia no clique (síncrono) — maximiza chance de popup em vez de nova guia. */
export function openMetaOAuthPopupWindow(): Window | null {
  const features = metaOAuthWindowFeatures();
  const popup = window.open("about:blank", META_OAUTH_WINDOW_NAME, features);
  return popup;
}

export function focusMetaOAuthPopup(popup: Window | null): void {
  popup?.focus();
}

export function postMetaOAuthResult(message: Omit<MetaOAuthMessage, "type">): void {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: META_OAUTH_MESSAGE, ...message }, window.location.origin);
  }
}

export function watchMetaOAuthPopup(popup: Window): Promise<MetaOAuthMessage["status"]> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (status: MetaOAuthMessage["status"]) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearInterval(pollTimer);
      resolve(status);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as MetaOAuthMessage | undefined;
      if (data?.type !== META_OAUTH_MESSAGE) return;
      finish(data.status);
    };

    window.addEventListener("message", onMessage);

    const pollTimer = window.setInterval(() => {
      if (popup.closed) {
        finish("cancelled");
      }
    }, 400);
  });
}

/**
 * Inicia OAuth: abre popup vazio e navega para o Facebook.
 * Chame openMetaOAuthPopupWindow() no clique antes de qualquer await.
 */
export function beginMetaOAuthPopup(
  popup: Window,
  contaId: string,
  returnTo: string
): Promise<MetaOAuthMessage["status"]> {
  const url = buildMetaOAuthUrl(contaId, returnTo);
  popup.location.replace(url);
  return watchMetaOAuthPopup(popup);
}

/** Abre popup do Facebook; mantém o Viziom aberto na aba original. */
export function startMetaOAuthPopup(
  contaId: string,
  returnTo: string
): Promise<MetaOAuthMessage["status"]> {
  const popup = openMetaOAuthPopupWindow();
  if (!popup) {
    throw new Error("Popup bloqueado. Permita popups para app.viziom.ia.br e tente novamente.");
  }
  return beginMetaOAuthPopup(popup, contaId, returnTo);
}

/** Fallback: redireciona a aba inteira (usado se popup for bloqueado). */
export function startMetaOAuthRedirect(contaId: string, returnTo: string): void {
  window.location.assign(buildMetaOAuthUrl(contaId, returnTo));
}
