const META_OAUTH_VERSION = "v25.0";
const META_OAUTH_STORAGE = {
  nonce: "meta_oauth_nonce",
  contaId: "meta_oauth_conta_id",
  returnTo: "meta_oauth_return",
} as const;

export function getMetaAppId(): string {
  return (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? "";
}

export function getMetaLoginConfigId(): string {
  return (import.meta.env.VITE_META_LOGIN_CONFIG_ID as string | undefined)?.trim() ?? "";
}

export function getMetaOAuthRedirectUri(): string {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/+$/, "")}/auth/meta/callback`;
  }
  const base =
    (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/+$/, "")}/auth/meta/callback`;
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

/** Redireciona para o diálogo OAuth da Meta (fluxo code, compatível com Login for Business). */
export function startMetaOAuthRedirect(contaId: string, returnTo: string): void {
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

  window.location.assign(
    `https://www.facebook.com/${META_OAUTH_VERSION}/dialog/oauth?${params.toString()}`
  );
}
