import { useRef, useState } from "react";
import { toast } from "sonner";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { MetaConnectionIndicator } from "@/components/layout/MetaConnectionIndicator";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import {
  beginMetaOAuthPopup,
  focusMetaOAuthPopup,
  getMetaAppId,
  openMetaOAuthPopupWindow,
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
  const popupRef = useRef<Window | null>(null);
  const metaAppId = getMetaAppId();

  const conectarMeta = () => {
    if (!contaAtiva || !isAdmin) return;
    if (!metaAppId) {
      toast.error("Configure VITE_META_APP_ID no ambiente.");
      return;
    }

    const returnTo = `${routes.configuracoes}/conectar-meta`;

    const popup = openMetaOAuthPopupWindow();
    if (!popup) {
      toast.error("Popup bloqueado. Permita popups para app.viziom.ia.br e tente novamente.");
      const usarAba = window.confirm(
        "Abrir login da Meta nesta aba? (você voltará ao Viziom após autorizar)"
      );
      if (usarAba) startMetaOAuthRedirect(contaAtiva.id, returnTo);
      return;
    }

    popupRef.current = popup;
    setConnecting(true);

    beginMetaOAuthPopup(popup, contaAtiva.id, returnTo)
      .then((status) => {
        if (status === "success") {
          toast.success("Conta Meta conectada com sucesso.");
          void reload();
        } else if (status === "cancelled") {
          toast.message("Login com Meta cancelado.");
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Erro ao conectar Meta.");
      })
      .finally(() => {
        popupRef.current = null;
        setConnecting(false);
      });
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      {connecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-lg">
            <MetaLogoIcon className="mx-auto mb-3 h-8 w-auto" />
            <p className="font-medium">Autorize na janela do Facebook</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O Viziom continua aberto aqui. Se o navegador abriu uma nova guia, use o botão abaixo
              para ir até ela.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => focusMetaOAuthPopup(popupRef.current)}
            >
              Ir para janela do Facebook
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Card className="max-w-xl" data-tour="meta-connect">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Conectar Meta</CardTitle>
              <MetaConnectionIndicator connected={connected} />
            </div>
            <CardDescription>
              Abre uma janela do Facebook para autorizar o Viziom.
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
                        : "Abre janela do Facebook — o Viziom permanece aberto aqui."}
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
    </>
  );
}
