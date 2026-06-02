import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import {
  clearMetaOAuthSession,
  getMetaOAuthRedirectUri,
  postMetaOAuthResult,
  readMetaOAuthSession,
} from "@/lib/metaOAuth";

export function MetaOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);
  const isPopup = typeof window !== "undefined" && Boolean(window.opener);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    const state = searchParams.get("state");
    const { nonce, contaId, returnTo } = readMetaOAuthSession(state);
    const fallback = returnTo || "/app";

    const closePopup = (status: "success" | "error" | "cancelled", error?: string) => {
      clearMetaOAuthSession();
      if (isPopup) {
        postMetaOAuthResult({ status, error });
        window.close();
        return;
      }
      if (status === "success") toast.success("Conta Meta conectada com sucesso.");
      else if (status === "cancelled") toast.error("Login com Meta cancelado.");
      else toast.error(error ?? "Erro ao conectar Meta.");
      navigate(fallback, { replace: true });
    };

    if (oauthError) {
      const msg =
        oauthError === "access_denied" ? "Login com Meta cancelado." : oauthError;
      closePopup("cancelled", msg);
      return;
    }

    const code = searchParams.get("code");

    if (!code || !state || !nonce || !contaId) {
      closePopup("error", "Sessão OAuth inválida ou expirada. Tente conectar novamente.");
      return;
    }

    void (async () => {
      try {
        await apiPost(
          "/api/leads/conectar-meta",
          { code, redirectUri: getMetaOAuthRedirectUri() },
          contaId
        );
        closePopup("success");
      } catch (err) {
        closePopup("error", err instanceof Error ? err.message : "Erro ao conectar Meta.");
      }
    })();
  }, [isPopup, navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Conectando conta Meta…</p>
    </div>
  );
}
