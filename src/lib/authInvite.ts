export const INVITE_FLOW_STORAGE_KEY = "viziom_invite_flow";
export const MIN_PASSWORD_LENGTH = 8;

function readAuthParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, "");
  const search = window.location.search.replace(/^\?/, "");
  return new URLSearchParams(hash || search);
}

/** Detecta redirect de convite Supabase e persiste flag para concluir cadastro. */
export function captureInviteFromUrl(): boolean {
  const type = readAuthParams().get("type");
  if (type === "invite") {
    sessionStorage.setItem(INVITE_FLOW_STORAGE_KEY, "1");
    return true;
  }
  return false;
}

export function isInviteFlowPending(): boolean {
  return sessionStorage.getItem(INVITE_FLOW_STORAGE_KEY) === "1";
}

export function clearInviteFlowPending(): void {
  sessionStorage.removeItem(INVITE_FLOW_STORAGE_KEY);
}

/** Remove tokens da barra de endereço após o Supabase processar a sessão. */
export function clearInviteParamsFromUrl(): void {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const hadQuery =
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("type") ||
    params.has("code");
  if (window.location.hash || hadQuery) {
    window.history.replaceState(null, "", pathname);
  }
}
