import { supabase } from "@/lib/supabase";

const PASSWORD_RESET_PATH = "/auth/redefinir-senha";

function readAuthParams(): URLSearchParams {
  const merged = new URLSearchParams(window.location.search.replace(/^\?/, ""));
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  hash.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

export function getPasswordResetRedirectUrl(): string {
  const base =
    (import.meta.env.VITE_APP_PUBLIC_URL as string | undefined)?.trim() ||
    window.location.origin;
  return `${base.replace(/\/+$/, "")}${PASSWORD_RESET_PATH}`;
}

/** Detecta callback de recuperação de senha do Supabase na URL. */
export function isPasswordRecoveryFromUrl(): boolean {
  const params = readAuthParams();
  return (
    params.get("type") === "recovery" ||
    params.has("code") ||
    params.has("token_hash") ||
    (params.has("access_token") && params.has("refresh_token"))
  );
}

/** Remove tokens da barra de endereço após o Supabase processar a sessão. */
export function clearPasswordRecoveryParamsFromUrl(): void {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  const hadQuery =
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("type") ||
    params.has("code") ||
    params.has("token_hash");
  if (window.location.hash || hadQuery) {
    window.history.replaceState(null, "", pathname);
  }
}

/**
 * Garante sessão de recuperação a partir da URL.
 * Só deve ser chamado depois de capturar isPasswordRecoveryFromUrl() no primeiro render,
 * para não apagar tokens antes do cliente processá-los.
 */
export async function establishPasswordRecoverySession(): Promise<boolean> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return true;

  const params = readAuthParams();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    return !error;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  return false;
}
