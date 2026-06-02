import { useState } from "react";
import { toast } from "sonner";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { MetaConnectionIndicator } from "@/components/layout/MetaConnectionIndicator";
import { useConta } from "@/contexts/ContaContext";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { apiPost } from "@/lib/api";
import { getMetaAppId, loginWithMetaFacebook } from "@/lib/metaFacebookSdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/badge";

export function MetaConnectSettingsPage() {
  const { contaAtiva, isAdmin } = useConta();
  const { loading, connected, reload } = useMetaConnectionStatus();
  const [connecting, setConnecting] = useState(false);
  const metaAppId = getMetaAppId();

  const conectarMeta = async () => {
    if (!contaAtiva || !isAdmin) return;
    if (!metaAppId) {
      toast.error("Configure VITE_META_APP_ID no ambiente.");
      return;
    }
    setConnecting(true);
    try {
      const shortToken = await loginWithMetaFacebook();
      await apiPost("/api/leads/conectar-meta", { accessToken: shortToken }, contaAtiva.id);
      toast.success("Conta Meta conectada com sucesso.");
      void reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao conectar Meta.");
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
            Abre o login do Facebook para autorizar o Viziom. O token fica salvo com segurança no
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
                      : "Clique abaixo para abrir o login do Facebook."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={connected ? "outline" : "default"}
                  onClick={conectarMeta}
                  disabled={connecting || !metaAppId}
                  className="gap-2"
                >
                  <MetaLogoIcon className="h-4 w-auto" />
                  {connecting ? "Conectando…" : connected ? "Reconectar Meta" : "Conectar Meta"}
                </Button>
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
