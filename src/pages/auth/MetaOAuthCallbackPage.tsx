import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import {
  clearMetaOAuthSession,
  getMetaOAuthRedirectUri,
  readMetaOAuthSession,
} from "@/lib/metaOAuth";

export function MetaOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const oauthError = searchParams.get("error_description") || searchParams.get("error");
    const { nonce, contaId, returnTo } = readMetaOAuthSession();
    const fallback = returnTo || "/app";

    if (oauthError) {
      clearMetaOAuthSession();
      toast.error(oauthError === "access_denied" ? "Login com Meta cancelado." : oauthError);
      navigate(fallback, { replace: true });
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state || state !== nonce || !contaId) {
      clearMetaOAuthSession();
      toast.error("Sessão OAuth inválida ou expirada. Tente conectar novamente.");
      navigate(fallback, { replace: true });
      return;
    }

    void (async () => {
      try {
        await apiPost(
          "/api/leads/conectar-meta",
          { code, redirectUri: getMetaOAuthRedirectUri() },
          contaId
        );
        toast.success("Conta Meta conectada com sucesso.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao conectar Meta.");
      } finally {
        clearMetaOAuthSession();
        navigate(fallback, { replace: true });
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Conectando conta Meta…</p>
    </div>
  );
}
