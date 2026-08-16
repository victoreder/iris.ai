import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { META_PIXEL_CONFIG_HASH } from "@/components/layout/MetaPixelHeaderStatus";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import type { LeadsConfig } from "@/types/database";

export function IntegrationsPage() {
  const { contaAtiva, isAdmin } = useConta();
  const [config, setConfig] = useState<LeadsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const { data } = await supabase
      .from("leads_config")
      .select("id, conta_id, meta_pixel_id, meta_conectado, meta_test_event_code, evento_padrao, updated_at")
      .eq("conta_id", contaAtiva.id)
      .maybeSingle();

    const cfg = data as LeadsConfig | null;
    setConfig(cfg);
    if (cfg) {
      setPixelId(cfg.meta_pixel_id ?? "");
      setAccessToken("");
      setTestCode(cfg.meta_test_event_code ?? "");
    }
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || window.location.hash !== `#${META_PIXEL_CONFIG_HASH}`) return;
    const el = document.getElementById(META_PIXEL_CONFIG_HASH);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  const salvar = async () => {
    if (!contaAtiva || !isAdmin) return;
    setSaving(true);
    try {
      await apiPost(
        "/api/leads/salvar-config-meta",
        {
          metaPixelId: pixelId.trim(),
          ...(accessToken.trim() ? { metaAccessToken: accessToken.trim() } : {}),
          metaTestEventCode: testCode.trim() || null,
        },
        contaAtiva.id
      );
      toast.success("Configuração salva.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const testar = async () => {
    if (!contaAtiva || !isAdmin) return;
    try {
      await apiPost("/api/leads/testar-meta", {}, contaAtiva.id);
      toast.success("Evento de teste enviado à Meta.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no teste.");
    }
  };

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Card
        id={META_PIXEL_CONFIG_HASH}
        data-tour="meta-pixel-config"
        className="max-w-xl scroll-mt-6"
      >
        <CardHeader>
          <CardTitle className="text-base">Meta Pixel + CAPI</CardTitle>
          <CardDescription>
            Informe o Pixel ID, o Access Token da API de Conversões (CAPI) e o código de teste. Eventos
            por etapa são configurados na Jornada de compra.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              disabled={!isAdmin}
              placeholder="Ex.: 123456789012345"
            />
          </div>
          <div className="space-y-1">
            <Label>Access Token (CAPI)</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={!isAdmin}
              placeholder={
                config?.meta_conectado
                  ? "Token já configurado — preencha só para substituir"
                  : "Token da API de Conversões"
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Código de teste (opcional)</Label>
            <Input
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              disabled={!isAdmin}
              placeholder="Test Events"
            />
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={salvar} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
              <Button variant="outline" onClick={testar} disabled={!config?.meta_pixel_id && !pixelId}>
                Enviar evento de teste (Lead)
              </Button>
            </div>
          )}
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">
              Apenas administradores podem alterar a integração Meta.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
