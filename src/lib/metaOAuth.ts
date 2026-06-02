const META_OAUTH_VERSION = "v25.0";
const META_OAUTH_CALLBACK_PATH = "/auth/meta/callback";
const META_OAUTH_STORAGE = {
  nonce: "meta_oauth_nonce",
  contaId: "meta_oauth_conta_id",
  returnTo: "meta_oauth_return",
} as const;

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
  sessionStorage.removeItem(META_OAUTH_STORAGE.nonce);
  sessionStorage.removeItem(META_OAUTH_STORAGE.contaId);
  sessionStorage.removeItem(META_OAUTH_STORAGE.returnTo);
}

export function readMetaOAuthSession() {
  return {
    nonce: sessionStorage.getItem(META_OAUTH_STORAGE.nonce),
    contaId: sessionStorage.getItem(META_OAUTH_STORAGE.contaId),
    returnTo: sessionStorage.getItem(META_OAUTH_STORAGE.returnTo),
  };
}

function buildMetaOAuthUrl(contaId: string, returnTo: string): string {
  const appId = getMetaAppId();
  if (!appId) throw new Error("VITE_META_APP_ID não configurado.");

  const redirectUri = getMetaOAuthRedirectUri();
  const configId = getMetaLoginConfigId();
  const nonce = crypto.randomUUID();

  sessionStorage.setItem(META_OAUTH_STORAGE.nonce, nonce);
  sessionStorage.setItem(META_OAUTH_STORAGE.contaId, contaId);
  sessionStorage.setItem(META_OAUTH_STORAGE.returnTo, returnTo);

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: nonce,
  });

  if (configId) {
    params.set("config_id", configId);
  } else {
    params.set("scope", "ads_management,business_management");
  }

  return `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${params.toString()}`;
}

function openMetaOAuthPopup(url: string): Window | null {
  const width = 560;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

  return window.open(
    url,
    "viziom_meta_oauth",
    `popup=yes,width=${width},height=${height},left=${left},top=${top}`
  );
}

export function postMetaOAuthResult(message: Omit<MetaOAuthMessage, "type">): void {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: META_OAUTH_MESSAGE, ...message }, window.location.origin);
  }
}

/** Abre popup do Facebook; mantém o Viziom aberto na aba original. */
export function startMetaOAuthPopup(
  contaId: string,
  returnTo: string
): Promise<MetaOAuthMessage["status"]> {
  const url = buildMetaOAuthUrl(contaId, returnTo);
  const popup = openMetaOAuthPopup(url);

  if (!popup) {
    throw new Error("Popup bloqueado. Permita popups para app.viziom.ia.br e tente novamente.");
  }

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

/** Fallback: redireciona a aba inteira (usado se popup for bloqueado). */
export function startMetaOAuthRedirect(contaId: string, returnTo: string): void {
  window.location.assign(buildMetaOAuthUrl(contaId, returnTo));
}
