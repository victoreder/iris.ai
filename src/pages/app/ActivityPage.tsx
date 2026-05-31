import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DialogRoot, DialogContent } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadsLog, LeadsLogNivel, LeadsLogTipo } from "@/types/database";

const nivelVariant: Record<LeadsLogNivel, "default" | "success" | "destructive" | "warning"> = {
  info: "default",
  sucesso: "success",
  erro: "destructive",
  aviso: "warning",
};

export function ActivityPage() {
  const { contaAtiva } = useConta();
  const [logs, setLogs] = useState<LeadsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<LeadsLogTipo | "all">("all");
  const [nivel, setNivel] = useState<LeadsLogNivel | "all">("all");
  const [selected, setSelected] = useState<LeadsLog | null>(null);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    let q = supabase
      .from("leads_logs")
      .select("*")
      .eq("conta_id", contaAtiva.id)
      .order("created_at", { ascending: false })
      .limit(300);

    if (tipo !== "all") q = q.eq("tipo", tipo);
    if (nivel !== "all") q = q.eq("nivel", nivel);

    const { data } = await q;
    setLogs((data as LeadsLog[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id, tipo, nivel]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground">Logs de cliques, webhooks e Meta</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 p-4">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as LeadsLogTipo | "all")}>
              <option value="all">Todos</option>
              <option value="clique">Clique</option>
              <option value="webhook">Webhook</option>
              <option value="meta">Meta</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Nível</Label>
            <Select value={nivel} onChange={(e) => setNivel(e.target.value as LeadsLogNivel | "all")}>
              <option value="all">Todos</option>
              <option value="sucesso">Sucesso</option>
              <option value="info">Info</option>
              <option value="aviso">Aviso</option>
              <option value="erro">Erro</option>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Clique ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer"
                onClick={() => setSelected(log)}
              >
                <TableCell className="text-xs whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant="default">{log.tipo}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={nivelVariant[log.nivel]}>{log.nivel}</Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">{log.mensagem}</TableCell>
                <TableCell className="text-xs">{log.instance_name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{log.clique_id ?? "—"}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Nenhum log
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DialogRoot open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent title="Detalhe do log">
          {selected && (
            <div className="space-y-3 text-sm">
              <p>{selected.mensagem}</p>
              {selected.detalhes && (
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(selected.detalhes, null, 2)}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
