import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";
import { LeadsOriginMetricsCards } from "@/components/leads/LeadsOriginMetricsCards";
import { LeadsWhatsappFilter } from "@/components/leads/LeadsWhatsappFilter";
import { LeadsKanbanBoard } from "@/components/leads/LeadsKanbanBoard";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogContent, DialogFooter, DialogRoot } from "@/components/ui/dialog";
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
import { exportLeadsCsv } from "@/lib/exportLeadsCsv";
import { parseLeadDetailTab, type LeadDetailTab } from "@/lib/leadDetailTabs";
import { filterConvertedLeads, groupLeadsByKanbanColumn } from "@/lib/leadsKanban";
import {
  getOriginLabel,
  isMetaOrigin,
  formatPhoneBR,
  getLeadInstanciaId,
  getDateRangeFromPreset,
  aggregateLeadsByOrigin,
  type DatePreset,
} from "@/lib/leadsAnalytics";
import { cn } from "@/lib/utils";
import type { LeadsClique, LeadsJornadaEtapa, LeadsLink } from "@/types/database";

type LeadsPeriod = Extract<DatePreset, "hoje" | "ultimos_7" | "ultimos_30" | "todo">;

const LEAD_DETAIL_SELECT =
  "*, leads_links(id, nome, slug, instancia_id), leads_jornada_etapas(id, nome, representa_venda)";

const PERIOD_LABELS: Record<LeadsPeriod, string> = {
  hoje: "Hoje",
  ultimos_7: "7 dias",
  ultimos_30: "30 dias",
  todo: "Todo período",
};

function matchesStructuralFilters(
  c: LeadsClique,
  instanciaFilter: string,
  linkFilter: string
) {
  if (instanciaFilter !== "all" && getLeadInstanciaId(c) !== instanciaFilter) return false;
  if (linkFilter !== "all" && c.link_id !== linkFilter) return false;
  return true;
}

function matchesPhoneFilter(c: LeadsClique, telefoneFilter: string) {
  if (!telefoneFilter.trim()) return true;
  const digits = telefoneFilter.replace(/\D/g, "");
  return (c.telefone_lead ?? "").replace(/\D/g, "").includes(digits);
}

function isLeadInPeriod(c: LeadsClique, from: Date, to: Date) {
  const ref = c.convertido_at ?? c.created_at;
  const d = new Date(ref);
  return d >= from && d <= to;
}

export function InboxPage() {
  const { contaAtiva, canWrite } = useConta();
  const { instancias } = useLeadsInstancias(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [cliques, setCliques] = useState<LeadsClique[]>([]);
  const [links, setLinks] = useState<LeadsLink[]>([]);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lista" | "colunas">("lista");
  const [period, setPeriod] = useState<LeadsPeriod>("ultimos_30");
  const [instanciaFilter, setInstanciaFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [telefoneFilter, setTelefoneFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kanbanInstanciaId, setKanbanInstanciaId] = useState<string | null>(null);
  const [whatsappPickerOpen, setWhatsappPickerOpen] = useState(false);
  const [pickerSelection, setPickerSelection] = useState("");
  const [urlLead, setUrlLead] = useState<LeadsClique | null>(null);
  const filtersToggleRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const urlLeadId = searchParams.get("lead");
  const detailTab = parseLeadDetailTab(searchParams.get("tab"));

  const selectedLead = useMemo(() => {
    if (!urlLeadId) return null;
    return cliques.find((c) => c.id === urlLeadId) ?? urlLead;
  }, [urlLeadId, cliques, urlLead]);

  const updateLeadUrl = useCallback(
    (leadId: string | null, tab: LeadDetailTab = "geral", replace = false) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (leadId) next.set("lead", leadId);
          else next.delete("lead");
          if (leadId && tab !== "geral") next.set("tab", tab);
          else next.delete("tab");
          return next;
        },
        { replace }
      );
    },
    [setSearchParams]
  );

  const closeLeadDetail = useCallback(() => {
    updateLeadUrl(null, "geral", true);
  }, [updateLeadUrl]);

  const handleDetailTabChange = useCallback(
    (tab: LeadDetailTab) => {
      if (!urlLeadId) return;
      updateLeadUrl(urlLeadId, tab, true);
    },
    [urlLeadId, updateLeadUrl]
  );

  useEffect(() => {
    if (!urlLeadId || !contaAtiva) {
      setUrlLead(null);
      return;
    }
    if (cliques.some((c) => c.id === urlLeadId)) {
      setUrlLead(null);
      return;
    }

    let cancelled = false;
    void supabase
      .from("leads_cliques")
      .select(LEAD_DETAIL_SELECT)
      .eq("id", urlLeadId)
      .eq("conta_id", contaAtiva.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setUrlLead(data as LeadsClique);
        else {
          setUrlLead(null);
          updateLeadUrl(null, "geral", true);
          toast.error("Lead não encontrado.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [urlLeadId, contaAtiva?.id, cliques, updateLeadUrl]);

  useEffect(() => {
    if (!filtersOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (filtersToggleRef.current?.contains(target)) return;
      if (filtersPanelRef.current?.contains(target)) return;
      setFiltersOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [filtersOpen]);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [cRes, lRes, eRes] = await Promise.all([
      supabase
        .from("leads_cliques")
        .select(LEAD_DETAIL_SELECT)
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

  const dateRange = useMemo(() => getDateRangeFromPreset(period), [period]);

  const structuralFiltered = useMemo(
    () => cliques.filter((c) => matchesStructuralFilters(c, instanciaFilter, linkFilter)),
    [cliques, instanciaFilter, linkFilter]
  );

  const metricas = useMemo(() => {
    const { from, to } = dateRange;
    const leadsInPeriod = filterConvertedLeads(structuralFiltered).filter((c) =>
      isLeadInPeriod(c, from, to)
    );
    return aggregateLeadsByOrigin(leadsInPeriod);
  }, [structuralFiltered, dateRange]);

  const leads = useMemo(() => {
    const { from, to } = dateRange;
    return filterConvertedLeads(structuralFiltered).filter(
      (c) =>
        isLeadInPeriod(c, from, to) &&
        matchesPhoneFilter(c, telefoneFilter)
    );
  }, [structuralFiltered, dateRange, telefoneFilter]);

  const linksFiltrados = useMemo(() => {
    if (instanciaFilter === "all") return links;
    return links.filter((l) => l.instancia_id === instanciaFilter);
  }, [links, instanciaFilter]);

  const kanbanInstancia = instancias.find((i) => i.id === kanbanInstanciaId) ?? null;

  const kanbanColumns = useMemo(() => {
    if (!kanbanInstanciaId) return [];
    const { from, to } = dateRange;
    const kanbanLeads = filterConvertedLeads(
      cliques.filter(
        (c) =>
          getLeadInstanciaId(c) === kanbanInstanciaId &&
          isLeadInPeriod(c, from, to) &&
          matchesPhoneFilter(c, telefoneFilter)
      )
    );
    return groupLeadsByKanbanColumn(kanbanLeads, etapas, kanbanInstanciaId);
  }, [cliques, etapas, kanbanInstanciaId, dateRange, telefoneFilter]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (instanciaFilter !== "all") n += 1;
    if (linkFilter !== "all") n += 1;
    return n;
  }, [instanciaFilter, linkFilter]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (instanciaFilter !== "all") {
      const inst = instancias.find((i) => i.id === instanciaFilter);
      labels.push(inst?.nome ?? "WhatsApp");
    }
    if (linkFilter !== "all") {
      const link = links.find((l) => l.id === linkFilter);
      labels.push(link?.nome ?? "Campanha");
    }
    return labels;
  }, [instanciaFilter, linkFilter, instancias, links]);

  const clearFilters = () => {
    setInstanciaFilter("all");
    setLinkFilter("all");
  };

  const openLeadDetail = (lead: LeadsClique, tab: LeadDetailTab = "geral") => {
    updateLeadUrl(lead.id, tab);
  };

  const openColunasView = () => {
    if (instancias.length === 0) {
      toast.error("Conecte um WhatsApp para ver o funil em colunas.");
      return;
    }
    if (instancias.length === 1) {
      setKanbanInstanciaId(instancias[0].id);
      setView("colunas");
      return;
    }
    setPickerSelection(kanbanInstanciaId ?? instancias[0]?.id ?? "");
    setWhatsappPickerOpen(true);
  };

  const confirmWhatsappPicker = () => {
    if (!pickerSelection) {
      toast.error("Selecione um WhatsApp.");
      return;
    }
    setKanbanInstanciaId(pickerSelection);
    setView("colunas");
    setWhatsappPickerOpen(false);
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error("Nenhum lead para exportar.");
      return;
    }
    exportLeadsCsv(leads);
    toast.success(`${leads.length} lead(s) exportado(s).`);
  };

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as LeadsPeriod)}
          className="w-full sm:w-40"
        >
          {(Object.keys(PERIOD_LABELS) as LeadsPeriod[]).map((key) => (
            <option key={key} value={key}>
              {PERIOD_LABELS[key]}
            </option>
          ))}
        </Select>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[200px] sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar telefone…"
              value={telefoneFilter}
              onChange={(e) => setTelefoneFilter(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} title="Exportar CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Button
              ref={filtersToggleRef}
              variant={filtersOpen ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              Filtrar
              {activeFiltersCount > 0 && (
                <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                  {activeFiltersCount}
                </span>
              )}
              {filtersOpen ? (
                <ChevronUp className="h-3.5 w-3.5 opacity-70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              )}
            </Button>
            <div className="flex rounded-lg border border-border p-0.5">
              <Button
                variant={view === "lista" ? "default" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={() => setView("lista")}
              >
                <List className="h-4 w-4" /> Lista
              </Button>
              <Button
                variant={view === "colunas" ? "default" : "ghost"}
                size="sm"
                className="rounded-md"
                onClick={openColunasView}
              >
                <LayoutGrid className="h-4 w-4" /> Colunas
              </Button>
            </div>
          </div>
        </div>
      </div>

      <LeadsOriginMetricsCards metrics={metricas} />

      {!filtersOpen && activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterLabels.map((label) => (
            <Badge key={label} variant="default" className="font-normal">
              {label}
            </Badge>
          ))}
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>
      )}

      {filtersOpen && (
        <Card ref={filtersPanelRef}>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <LeadsWhatsappFilter value={instanciaFilter} onChange={setInstanciaFilter} />
              </div>
              <div className="space-y-1">
                <Label>Campanha</Label>
                <Select value={linkFilter} onChange={(e) => setLinkFilter(e.target.value)}>
                  <option value="all">Todas</option>
                  {linksFiltrados.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex justify-end border-t border-border pt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" /> Limpar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "lista" ? (
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {leads.length === 0
                ? "Nenhum lead com os filtros atuais"
                : `${leads.length} lead${leads.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Entrada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => openLeadDetail(c)}
                >
                  <TableCell className="font-medium">{formatPhoneBR(c.telefone_lead)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {c.leads_jornada_etapas?.nome ? (
                      <button
                        type="button"
                        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => openLeadDetail(c, "jornada")}
                        title="Ver jornada"
                      >
                        <Badge variant="outline" className="font-normal hover:bg-muted">
                          {c.leads_jornada_etapas.nome}
                        </Badge>
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.leads_links?.nome ?? "WhatsApp direto"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      {isMetaOrigin(c) && <MetaOriginBadge />}
                      {getOriginLabel(c)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.convertido_at ?? c.created_at), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                </TableRow>
              ))}
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <p className="font-medium text-foreground">Nenhum lead encontrado</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ajuste o período, filtros ou aguarde novas conversões.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-3">
          {kanbanInstancia && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Funil de{" "}
                <span className="font-medium text-foreground">{kanbanInstancia.nome}</span>
                {kanbanInstancia.telefone ? ` · ${kanbanInstancia.telefone}` : ""}
              </p>
              {instancias.length > 1 && (
                <Button variant="ghost" size="sm" onClick={openColunasView}>
                  Trocar WhatsApp
                </Button>
              )}
            </div>
          )}
          {kanbanInstanciaId ? (
            <LeadsKanbanBoard
              columns={kanbanColumns}
              onLeadClick={(lead) => openLeadDetail(lead)}
              onDragEnd={handleDragEnd}
              canDrag={canWrite}
            />
          ) : null}
        </div>
      )}

      <DialogRoot open={whatsappPickerOpen} onOpenChange={setWhatsappPickerOpen}>
        <DialogContent title="Qual WhatsApp?" description="Escolha o número para ver o funil em colunas.">
          <div className="space-y-2">
            {instancias.map((inst) => (
              <button
                key={inst.id}
                type="button"
                onClick={() => setPickerSelection(inst.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  pickerSelection === inst.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <span className="font-medium">{inst.nome}</span>
                {inst.telefone && (
                  <span className="text-muted-foreground">{inst.telefone}</span>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappPickerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmWhatsappPicker}>Ver colunas</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <LeadDetailDialog
        lead={selectedLead}
        etapas={etapas}
        open={!!urlLeadId && !!selectedLead}
        initialTab={detailTab}
        onTabChange={handleDetailTabChange}
        onClose={closeLeadDetail}
        onUpdated={load}
      />
    </div>
  );
}
