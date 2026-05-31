import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
      .select("*")
      .eq("conta_id", contaAtiva.id)
      .maybeSingle();

    const cfg = data as LeadsConfig | null;
    setConfig(cfg);
    if (cfg) {
      setPixelId(cfg.meta_pixel_id ?? "");
      setAccessToken(cfg.meta_access_token ?? "");
      setTestCode(cfg.meta_test_event_code ?? "");
    }
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const salvar = async () => {
    if (!contaAtiva || !isAdmin) return;
    setSaving(true);
    try {
      await apiPost(
        "/api/leads/salvar-config-meta",
        {
          metaPixelId: pixelId.trim(),
          metaAccessToken: accessToken.trim(),
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
      <div>
        <p className="text-muted-foreground">Meta Conversions API</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Meta Pixel + CAPI</CardTitle>
          <CardDescription>
            Eventos por etapa são configurados na aba Pipeline. Aqui você define pixel e token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Pixel ID</Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          <div className="space-y-1">
            <Label>Access Token (CAPI)</Label>
            <Input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={!isAdmin}
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
              <Button variant="outline" onClick={testar} disabled={!config?.meta_pixel_id}>
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
