import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { describeLeadEvento, LEAD_EVENTO_LABELS } from "@/lib/leadEventos";
import { formatPhoneBR } from "@/lib/leadsAnalytics";
import type { LeadsCliqueEvento, LeadsCliqueEventoTipo } from "@/types/database";

type EventoComLead = LeadsCliqueEvento & {
  leads_cliques?: { telefone_lead: string | null } | null;
};

const eventoBadgeVariant: Record<
  LeadsCliqueEventoTipo,
  "default" | "success" | "destructive" | "warning" | "meta"
> = {
  lead_novo: "success",
  etapa_alterada: "default",
  meta_enviado: "meta",
  valor_venda_alterado: "warning",
  origem_adicional: "primary",
};

export function ActivityPage() {
  const { contaAtiva } = useConta();
  const [eventos, setEventos] = useState<EventoComLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<LeadsCliqueEventoTipo | "all">("all");

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    let q = supabase
      .from("leads_cliques_eventos")
      .select("*, leads_cliques(telefone_lead)")
      .eq("conta_id", contaAtiva.id)
      .order("created_at", { ascending: false })
      .limit(300);

    if (tipo !== "all") q = q.eq("tipo", tipo);

    const { data } = await q;
    setEventos((data as EventoComLead[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id, tipo]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">
            Novos leads, mudanças de etapa e envios para a Meta
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 p-4">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as LeadsCliqueEventoTipo | "all")}
            >
              <option value="all">Todos</option>
              <option value="lead_novo">Novo lead</option>
              <option value="etapa_alterada">Etapa alterada</option>
              <option value="meta_enviado">Evento Meta</option>
              <option value="valor_venda_alterado">Valor da venda</option>
              <option value="origem_adicional">Nova origem</option>
            </Select>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.map((evento) => (
              <TableRow key={evento.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {format(new Date(evento.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant={eventoBadgeVariant[evento.tipo]}>
                    {LEAD_EVENTO_LABELS[evento.tipo]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatPhoneBR(evento.leads_cliques?.telefone_lead)}
                </TableCell>
                <TableCell className="max-w-md text-sm">{describeLeadEvento(evento)}</TableCell>
              </TableRow>
            ))}
            {eventos.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhuma atividade registrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
