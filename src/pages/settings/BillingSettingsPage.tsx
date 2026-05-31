import { useEffect, useState } from "react";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
import type { Plano } from "@/types/usuario";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const RECORRENCIA: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export function BillingSettingsPage() {
  const { contaAtiva } = useConta();
  const [plano, setPlano] = useState<Plano | null>(null);

  useEffect(() => {
    if (!contaAtiva?.plano_id) {
      setPlano(null);
      return;
    }
    void supabase
      .from("planos")
      .select("*")
      .eq("id", contaAtiva.plano_id)
      .maybeSingle()
      .then(({ data }) => setPlano((data as Plano) ?? null));
  }, [contaAtiva?.plano_id]);

  if (!contaAtiva) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano</CardTitle>
        <CardDescription>
          Informações do plano contratado. Alterações são feitas pelo administrador Viziom.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label>Plano atual</Label>
          <Input value={plano?.nome ?? "—"} disabled />
        </div>
        <div className="space-y-2">
          <Label>Preço</Label>
          <Input
            value={plano ? `R$ ${Number(plano.preco).toFixed(2)}` : "—"}
            disabled
          />
        </div>
        {plano && (
          <>
            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Input value={RECORRENCIA[plano.recorrencia] ?? plano.recorrencia} disabled />
            </div>
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>WhatsApps: {plano.max_whatsapps ?? "Ilimitado"}</p>
              <p>Leads: {plano.max_leads ?? "Ilimitado"}</p>
              <p>Usuários: {plano.max_usuarios ?? "Ilimitado"}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
