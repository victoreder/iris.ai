const PASSWORD_RESET_PATH = "/auth/redefinir-senha";

function readAuthParams(): URLSearchParams {
  const hash = window.location.hash.replace(/^#/, "");
  const search = window.location.search.replace(/^\?/, "");
  return new URLSearchParams(hash || search);
}

export function getPasswordResetRedirectUrl(): string {
  const base =
    (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim() ||
    window.location.origin;
  return `${base.replace(/\/+$/, "")}${PASSWORD_RESET_PATH}`;
}

/** Detecta link de recuperação de senha do Supabase na URL. */
export function isPasswordRecoveryFromUrl(): boolean {
  return readAuthParams().get("type") === "recovery";
}

/** Remove tokens da barra de endereço após o Supabase processar a sessão. */
export function clearPasswordRecoveryParamsFromUrl(): void {
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
