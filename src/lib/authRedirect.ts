export const AUTH_REDIRECT_PARAM = "redirect";

const DEFAULT_POST_LOGIN_PATH = "/app";

const BLOCKED_REDIRECT_PREFIXES = [
  "/login",
  "/signup",
  "/auth/convite",
  "/auth/esqueci-senha",
  "/auth/redefinir-senha",
];

/** Aceita apenas caminhos internos para evitar open redirect. */
export function sanitizeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (
    BLOCKED_REDIRECT_PREFIXES.some(
      (prefix) =>
        trimmed === prefix ||
        trimmed.startsWith(`${prefix}?`) ||
        trimmed.startsWith(`${prefix}#`) ||
        trimmed.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }
  return trimmed;
}

export function buildLoginPath(fromPath?: string): string {
  const safe = sanitizeRedirectPath(fromPath);
  if (!safe) return "/login";
  return `/login?${AUTH_REDIRECT_PARAM}=${encodeURIComponent(safe)}`;
}

export function resolvePostLoginPath(
  search: string,
  fallback = DEFAULT_POST_LOGIN_PATH
): string {
  const params = new URLSearchParams(search.replace(/^\?/, ""));
  return sanitizeRedirectPath(params.get(AUTH_REDIRECT_PARAM)) ?? fallback;
}
