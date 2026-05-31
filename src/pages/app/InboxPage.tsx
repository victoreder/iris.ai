import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Check, Clock, LayoutGrid, List, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";
import { LeadsWhatsappFilter } from "@/components/leads/LeadsWhatsappFilter";
import { LeadsKanbanBoard } from "@/components/leads/LeadsKanbanBoard";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiPost } from "@/lib/api";
import { groupLeadsByKanbanColumn } from "@/lib/leadsKanban";
import {
  getOriginLabel,
  isMetaOrigin,
  formatPhoneBR,
  getLeadInstanciaId,
} from "@/lib/leadsAnalytics";
import type { LeadsClique, LeadsJornadaEtapa, LeadsLink, StatusLeadClique } from "@/types/database";

export function InboxPage() {
  const { contaAtiva, canWrite } = useConta();
  const { instancias } = useLeadsInstancias(true);
  const [cliques, setCliques] = useState<LeadsClique[]>([]);
  const [links, setLinks] = useState<LeadsLink[]>([]);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lista" | "colunas">("lista");
  const [instanciaFilter, setInstanciaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusLeadClique | "all">("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [telefoneFilter, setTelefoneFilter] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadsClique | null>(null);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [cRes, lRes, eRes] = await Promise.all([
      supabase
        .from("leads_cliques")
        .select("*, leads_links(id, nome, slug, instancia_id), leads_jornada_etapas(id, nome, representa_venda)")
        .eq("conta_id", contaAtiva.id)
        .order("convertido_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("leads_links").select("id, nome, slug, instancia_id").eq("conta_id", contaAtiva.id),
      supabase.from("leads_jornada_etapas").select("*").eq("conta_id", contaAtiva.id).order("posicao"),
    ]);
    setCliques((cRes.data as LeadsClique[]) ?? []);
    setLinks((lRes.data as LeadsLink[]) ?? []);
    setEtapas((eRes.data as LeadsJornadaEtapa[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (view === "colunas" && instanciaFilter === "all" && instancias[0]) {
      setInstanciaFilter(instancias[0].id);
    }
  }, [view, instanciaFilter, instancias]);

  const hojeCliques = cliques.filter((c) => isToday(new Date(c.created_at)));
  const convertidosHoje = hojeCliques.filter((c) => c.status === "convertido").length;
  const taxaHoje =
    hojeCliques.length > 0 ? Math.round((convertidosHoje / hojeCliques.length) * 100) : 0;

  const filtered = useMemo(() => {
    return cliques.filter((c) => {
      if (instanciaFilter !== "all") {
        if (getLeadInstanciaId(c) !== instanciaFilter) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (linkFilter !== "all" && c.link_id !== linkFilter) return false;
      if (telefoneFilter.trim()) {
        const digits = telefoneFilter.replace(/\D/g, "");
        if (!(c.telefone_lead ?? "").replace(/\D/g, "").includes(digits)) return false;
      }
      return true;
    });
  }, [cliques, instanciaFilter, statusFilter, linkFilter, telefoneFilter]);

  const linksFiltrados = useMemo(() => {
    if (instanciaFilter === "all") return links;
    return links.filter((l) => l.instancia_id === instanciaFilter);
  }, [links, instanciaFilter]);

  const kanbanColumns = useMemo(() => {
    if (instanciaFilter === "all") return [];
    return groupLeadsByKanbanColumn(filtered, etapas, instanciaFilter);
  }, [filtered, etapas, instanciaFilter]);

  const handleDragEnd = async (leadId: string, etapaId: string) => {
    if (!contaAtiva || !canWrite) return;
    try {
      await apiPost("/api/leads/atualizar-etapa-lead", { cliqueId: leadId, etapaId }, contaAtiva.id);
      toast.success("Etapa atualizada.");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover lead.");
    }
  };

  const statusBadge = (status: StatusLeadClique) => {
    const map = {
      convertido: "success" as const,
      expirado: "destructive" as const,
      aguardando: "warning" as const,
    };
    const labels = { convertido: "Convertido", expirado: "Expirado", aguardando: "Aguardando" };
    return <Badge variant={map[status]}>{labels[status]}</Badge>;
  };

  const metaIcon = (c: LeadsClique) => {
    if (c.meta_enviado) return <Check className="h-4 w-4 text-success" />;
    if (c.meta_erro) return <AlertTriangle className="h-4 w-4 text-warning" />;
    if (c.status === "convertido") return <Clock className="h-4 w-4 text-muted-foreground" />;
    return <X className="h-4 w-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">Operação diária de leads</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "lista" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("lista")}
          >
            <List className="h-4 w-4" /> Lista
          </Button>
          <Button
            variant={view === "colunas" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("colunas")}
          >
            <LayoutGrid className="h-4 w-4" /> Colunas
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{hojeCliques.length}</p>
            <p className="text-sm text-muted-foreground">Cliques hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{convertidosHoje}</p>
            <p className="text-sm text-muted-foreground">Convertidos hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{taxaHoje}%</p>
            <p className="text-sm text-muted-foreground">Taxa conversão (hoje)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
          <div className="space-y-1">
            <Label>WhatsApp</Label>
            <LeadsWhatsappFilter value={instanciaFilter} onChange={setInstanciaFilter} />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusLeadClique | "all")}
            >
              <option value="all">Todos</option>
              <option value="aguardando">Aguardando</option>
              <option value="convertido">Convertido</option>
              <option value="expirado">Expirado</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Link</Label>
            <Select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)}>
              <option value="all">Todos</option>
              {linksFiltrados.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input
              placeholder="Buscar dígitos…"
              value={telefoneFilter}
              onChange={(e) => setTelefoneFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {view === "lista" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Clique</TableHead>
                <TableHead>Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedLead(c)}
                >
                  <TableCell>{formatPhoneBR(c.telefone_lead)}</TableCell>
                  <TableCell>{statusBadge(c.status)}</TableCell>
                  <TableCell>{c.leads_jornada_etapas?.nome ?? "—"}</TableCell>
                  <TableCell>{c.leads_links?.nome ?? "WhatsApp direto"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {isMetaOrigin(c) && <MetaOriginBadge />}
                      {getOriginLabel(c)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[c.device_type, c.browser].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(c.convertido_at ?? c.created_at), "dd/MM HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>{metaIcon(c)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : instanciaFilter === "all" ? (
        <p className="text-muted-foreground">Selecione um WhatsApp para ver o kanban.</p>
      ) : (
        <LeadsKanbanBoard
          columns={kanbanColumns}
          onLeadClick={setSelectedLead}
          onDragEnd={handleDragEnd}
          canDrag={canWrite}
        />
      )}

      <LeadDetailDialog
        lead={selectedLead}
        etapas={etapas}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdated={load}
      />
    </div>
  );
}
