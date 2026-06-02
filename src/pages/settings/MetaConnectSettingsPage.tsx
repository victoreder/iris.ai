import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { MetaConnectionIndicator } from "@/components/layout/MetaConnectionIndicator";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { apiPost } from "@/lib/api";
import { getMetaAppId, startMetaOAuthNewTab } from "@/lib/metaOAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";

export function MetaConnectSettingsPage() {
  const { contaAtiva, isAdmin } = useConta();
  const routes = useAppRoutes();
  const { loading, connected, reload } = useMetaConnectionStatus();
  const [disconnecting, setDisconnecting] = useState(false);
  const metaAppId = getMetaAppId();

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [reload]);

  const conectarMeta = () => {
    if (!contaAtiva || !isAdmin) return;
    if (!metaAppId) {
      toast.error("Configure VITE_META_APP_ID no ambiente.");
      return;
    }

    try {
      startMetaOAuthNewTab(contaAtiva.id, `${routes.configuracoes}/conectar-meta`);
      toast.message("Abra a nova guia do Facebook para autorizar o Viziom.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar login Meta.");
    }
  };

  const desconectarMeta = async () => {
    if (!contaAtiva || !isAdmin || !connected) return;
    const confirmar = window.confirm(
      "Desconectar a Meta? Campanhas de Mensagem e eventos CAPI que dependem do token OAuth deixarão de funcionar até reconectar."
    );
    if (!confirmar) return;

    setDisconnecting(true);
    try {
      await apiPost("/api/leads/desconectar-meta", {}, contaAtiva.id);
      toast.success("Conta Meta desconectada.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar Meta.");
    } finally {
      setDisconnecting(false);
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
            Abre o login do Facebook em uma nova guia para autorizar o Viziom.
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
                      : "Após autorizar na Meta, volte a esta guia — o status atualiza automaticamente."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={connected ? "outline" : "default"}
                    onClick={conectarMeta}
                    disabled={disconnecting || !metaAppId}
                    className="gap-2"
                  >
                    <MetaLogoIcon className="h-4 w-auto" />
                    {connected ? "Reconectar Meta" : "Conectar Meta"}
                  </Button>
                  {connected && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={desconectarMeta}
                      disabled={disconnecting}
                      className="text-destructive hover:text-destructive"
                    >
                      {disconnecting ? "Desconectando…" : "Desconectar"}
                    </Button>
                  )}
                </div>
              </div>
              {!metaAppId && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Defina VITE_META_APP_ID (e META_APP_SECRET no backend) para habilitar o login.
                </p>
              )}
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
