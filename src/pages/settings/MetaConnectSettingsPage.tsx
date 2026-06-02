import { useState } from "react";
import { toast } from "sonner";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { MetaConnectionIndicator } from "@/components/layout/MetaConnectionIndicator";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import {
  getMetaAppId,
  getMetaOAuthRedirectUri,
  startMetaOAuthPopup,
  startMetaOAuthRedirect,
} from "@/lib/metaOAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";

export function MetaConnectSettingsPage() {
  const { contaAtiva, isAdmin } = useConta();
  const routes = useAppRoutes();
  const { loading, connected, reload } = useMetaConnectionStatus();
  const [connecting, setConnecting] = useState(false);
  const metaAppId = getMetaAppId();
  const oauthRedirectUri = getMetaOAuthRedirectUri();

  const conectarMeta = async () => {
    if (!contaAtiva || !isAdmin) return;
    if (!metaAppId) {
      toast.error("Configure VITE_META_APP_ID no ambiente.");
      return;
    }

    const returnTo = `${routes.configuracoes}/conectar-meta`;
    setConnecting(true);

    try {
      const status = await startMetaOAuthPopup(contaAtiva.id, returnTo);
      if (status === "success") {
        toast.success("Conta Meta conectada com sucesso.");
        void reload();
      } else if (status === "cancelled") {
        toast.message("Login com Meta cancelado.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar login Meta.";
      if (message.includes("Popup bloqueado")) {
        toast.error(message);
        const usarAba = window.confirm(
          "Popup bloqueado pelo navegador. Abrir login da Meta nesta aba? (você voltará ao Viziom após autorizar)"
        );
        if (usarAba) startMetaOAuthRedirect(contaAtiva.id, returnTo);
      } else {
        toast.error(message);
      }
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Card className="max-w-xl" data-tour="meta-connect">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Conectar Meta</CardTitle>
            <MetaConnectionIndicator connected={connected} />
          </div>
          <CardDescription>
            Abre uma janela do Facebook para autorizar o Viziom. O token fica salvo com segurança no
            servidor. Configure o Pixel na aba Meta Pixel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {connected ? "Conta Meta conectada" : "Nenhuma conta conectada"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connected
                      ? "Você pode reconectar para atualizar as permissões."
                      : "Abre popup do Facebook — o Viziom permanece aberto aqui."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={connected ? "outline" : "default"}
                  onClick={() => void conectarMeta()}
                  disabled={connecting || !metaAppId}
                  className="gap-2"
                >
                  <MetaLogoIcon className="h-4 w-auto" />
                  {connecting
                    ? "Aguardando Meta…"
                    : connected
                      ? "Reconectar Meta"
                      : "Conectar Meta"}
                </Button>
              </div>
              {!metaAppId && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Defina VITE_META_APP_ID (e META_APP_SECRET no backend) para habilitar o login.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                URI OAuth (cadastre exatamente no Meta Developer):{" "}
                <code className="break-all rounded bg-background px-1 py-0.5 text-[11px]">
                  {oauthRedirectUri}
                </code>
              </p>
              {connected && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Token salvo com segurança no servidor.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem conectar a Meta.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
