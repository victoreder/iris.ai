import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import {
  clearMetaOAuthSession,
  getMetaOAuthRedirectUri,
  readMetaOAuthSession,
} from "@/lib/metaOAuth";
import { supabase } from "@/lib/supabase";

async function waitForAuthSession(timeoutMs = 8000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

export function MetaOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);
  const [statusMessage, setStatusMessage] = useState("Conectando conta Meta…");

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const finish = (
      outcome: "success" | "error" | "cancelled",
      message: string,
      returnTo: string
    ) => {
      clearMetaOAuthSession();
      if (outcome === "success") toast.success(message);
      else if (outcome === "cancelled") toast.message(message);
      else toast.error(message);
      navigate(returnTo, { replace: true });
    };

    void (async () => {
      const oauthError = searchParams.get("error_description") || searchParams.get("error");
      const state = searchParams.get("state");
      const { nonce, contaId, returnTo } = readMetaOAuthSession(state);
      const fallback = returnTo || "/app";

      if (oauthError) {
        const msg =
          oauthError === "access_denied" ? "Login com Meta cancelado." : oauthError;
        finish("cancelled", msg, fallback);
        return;
      }

      const code = searchParams.get("code");
      if (!code || !state || !nonce || !contaId) {
        finish(
          "error",
          "Sessão OAuth inválida ou expirada. Tente conectar novamente.",
          fallback
        );
        return;
      }

      setStatusMessage("Validando sessão do Viziom…");
      const hasSession = await waitForAuthSession();
      if (!hasSession) {
        finish(
          "error",
          "Sessão expirada. Faça login no Viziom e conecte a Meta novamente.",
          "/login"
        );
        return;
      }

      setStatusMessage("Salvando conexão com a Meta…");
      try {
        await apiPost(
          "/api/leads/conectar-meta",
          { code, redirectUri: getMetaOAuthRedirectUri() },
          contaId
        );
        finish("success", "Conta Meta conectada com sucesso.", fallback);
      } catch (err) {
        finish(
          "error",
          err instanceof Error ? err.message : "Erro ao conectar Meta.",
          fallback
        );
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">{statusMessage}</p>
    </div>
  );
}
