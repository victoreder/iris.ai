import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";
import { LeadsInboxTable } from "@/components/leads/LeadsInboxTable";
import { LeadsOriginMetricsCards } from "@/components/leads/LeadsOriginMetricsCards";
import { LeadsWhatsappFilter } from "@/components/leads/LeadsWhatsappFilter";
import { LeadsKanbanBoard } from "@/components/leads/LeadsKanbanBoard";
import { InboxLegacyLeadRedirect } from "@/pages/app/LeadDetailPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogContent, DialogFooter, DialogRoot } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import { apiPost } from "@/lib/api";
import { exportLeadsCsv } from "@/lib/exportLeadsCsv";
import { contaUrlRef } from "@/lib/appNavigation";
import { leadDetailPath, type LeadDetailTab } from "@/lib/leadDetailTabs";
import { LEAD_DETAIL_SELECT } from "@/lib/leadsConstants";
import { groupLeadsByKanbanColumn } from "@/lib/leadsKanban";
import { aggregateLeadCrmMetrics } from "@/lib/leadCrm";
import { getCanonicalConvertedLeads } from "@/lib/leadPhone";
import {
  countActiveLeadsUtmFilters,
  collectUniqueUtmValues,
  getActiveLeadsUtmFilterLabels,
  LEADS_UTM_FIELDS,
  LEADS_UTM_LABELS,
  matchesLeadsUtmFilters,
  parseLeadsUtmFiltersFromSearch,
  setLeadsUtmFilterInSearchParams,
  stripLeadsUtmParams,
  type LeadsUtmField,
} from "@/lib/leadsUtmFilters";
import { LeadsUtmSearchSelect } from "@/components/leads/LeadsUtmSearchSelect";
import {
  DEFAULT_LEADS_TABLE_COLUMNS,
  loadSavedLeadsTableColumns,
  type LeadsTableColumnKey,
} from "@/lib/leadsTableColumns";
import {
  extractPhoneDigits,
  getLeadInstanciaId,
  getDateRangeFromPreset,
  aggregateLeadsByOrigin,
  isLeadInPeriod,
  type DatePreset,
} from "@/lib/leadsAnalytics";
import { cn } from "@/lib/utils";
import type { LeadsClique, LeadsJornadaEtapa, LeadsLink } from "@/types/database";

type LeadsPeriod = Extract<DatePreset, "hoje" | "ultimos_7" | "ultimos_30" | "todo">;

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
  return extractPhoneDigits(c.telefone_lead).includes(digits);
}

export function InboxPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contaAtiva, canWrite } = useConta();
  const { instancias } = useLeadsInstancias(true);
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
  const [tableColumns, setTableColumns] = useState<LeadsTableColumnKey[]>(DEFAULT_LEADS_TABLE_COLUMNS);
  const [columnsPickerOpen, setColumnsPickerOpen] = useState(false);
  const filtersToggleRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const utmFilters = useMemo(
    () => parseLeadsUtmFiltersFromSearch(searchParams),
    [searchParams]
  );

  const utmOptions = useMemo(() => collectUniqueUtmValues(cliques), [cliques]);

  const setUtmFilter = (field: LeadsUtmField, value: string) => {
    setSearchParams(setLeadsUtmFilterInSearchParams(searchParams, field, value), { replace: true });
  };

  const openLeadDetail = (lead: LeadsClique, tab: LeadDetailTab = "geral") => {
    if (!contaAtiva) return;
    navigate(leadDetailPath(contaUrlRef(contaAtiva), lead.id, tab));
  };

  useEffect(() => {
    if (!contaAtiva) return;
    const saved = loadSavedLeadsTableColumns(contaAtiva.id);
    setTableColumns(saved ?? [...DEFAULT_LEADS_TABLE_COLUMNS]);
  }, [contaAtiva?.id]);

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
    () =>
      cliques.filter(
        (c) =>
          matchesStructuralFilters(c, instanciaFilter, linkFilter) &&
          matchesLeadsUtmFilters(c, utmFilters)
      ),
    [cliques, instanciaFilter, linkFilter, utmFilters]
  );

  const metricas = useMemo(() => {
    const { from, to } = dateRange;
    const leadsInPeriod = getCanonicalConvertedLeads(structuralFiltered).filter((c) =>
      isLeadInPeriod(c, from, to)
    );
    return aggregateLeadsByOrigin(leadsInPeriod);
  }, [structuralFiltered, dateRange]);

  const leads = useMemo(() => {
    const { from, to } = dateRange;
    return getCanonicalConvertedLeads(structuralFiltered).filter(
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
    const kanbanLeads = getCanonicalConvertedLeads(
      cliques.filter(
        (c) =>
          getLeadInstanciaId(c) === kanbanInstanciaId &&
          isLeadInPeriod(c, from, to) &&
          matchesPhoneFilter(c, telefoneFilter)
      )
    );
    return groupLeadsByKanbanColumn(kanbanLeads, etapas, kanbanInstanciaId);
  }, [cliques, etapas, kanbanInstanciaId, dateRange, telefoneFilter]);

  const kanbanCrmMetrics = useMemo(
    () => aggregateLeadCrmMetrics(kanbanColumns.flatMap((col) => col.leads)),
    [kanbanColumns]
  );

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (instanciaFilter !== "all") n += 1;
    if (linkFilter !== "all") n += 1;
    n += countActiveLeadsUtmFilters(utmFilters);
    return n;
  }, [instanciaFilter, linkFilter, utmFilters]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (instanciaFilter !== "all") {
      const inst = instancias.find((i) => i.id === instanciaFilter);
      labels.push(inst?.nome ?? "WhatsApp");
    }
    if (linkFilter !== "all") {
      const link = links.find((l) => l.id === linkFilter);
      labels.push(link?.nome ?? "Link rastreável");
    }
    labels.push(...getActiveLeadsUtmFilterLabels(utmFilters));
    return labels;
  }, [instanciaFilter, linkFilter, utmFilters, instancias, links]);

  const clearFilters = () => {
    setInstanciaFilter("all");
    setLinkFilter("all");
    setSearchParams(stripLeadsUtmParams(searchParams), { replace: true });
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
    const current = cliques.find((c) => c.id === leadId);
    if (current?.etapa_id === etapaId) return;
    const etapa = etapas.find((e) => e.id === etapaId);
    setCliques((prev) =>
      prev.map((c) =>
        c.id === leadId
          ? {
              ...c,
              etapa_id: etapaId,
              etapa_atualizada_at: new Date().toISOString(),
              leads_jornada_etapas: etapa
                ? {
                    id: etapa.id,
                    nome: etapa.nome,
                    representa_venda: etapa.representa_venda,
                    valor_venda: etapa.valor_venda,
                  }
                : c.leads_jornada_etapas,
            }
          : c
      )
    );
    try {
      await apiPost("/api/leads/atualizar-etapa-lead", { cliqueId: leadId, etapaId }, contaAtiva.id);
      toast.success("Etapa atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao mover lead.");
      void load();
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
      <InboxLegacyLeadRedirect />
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
                <Label>Link rastreável</Label>
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

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                UTMs
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {LEADS_UTM_FIELDS.map((field) => {
                  const options = [...utmOptions[field]];
                  const selected = utmFilters[field];
                  if (selected && !options.includes(selected)) {
                    options.unshift(selected);
                  }
                  return (
                    <LeadsUtmSearchSelect
                      key={field}
                      label={`UTM ${LEADS_UTM_LABELS[field]}`}
                      value={selected}
                      options={options}
                      onChange={(value) => setUtmFilter(field, value)}
                    />
                  );
                })}
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
        <div data-tour="leads-inbox">
          <LeadsInboxTable
            leads={leads}
            columns={tableColumns}
            contaId={contaAtiva!.id}
            columnsPickerOpen={columnsPickerOpen}
            onColumnsPickerOpenChange={setColumnsPickerOpen}
            onColumnsChange={setTableColumns}
            onLeadClick={openLeadDetail}
          />
        </div>
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
          {kanbanCrmMetrics.total > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Leads no funil</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{kanbanCrmMetrics.total}</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Follow-up atrasado</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-destructive">
                  {kanbanCrmMetrics.followUpAtrasado}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reuniões hoje</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums text-warning">
                  {kanbanCrmMetrics.reuniaoHoje}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sem responsável</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{kanbanCrmMetrics.semResponsavel}</p>
              </div>
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
    </div>
  );
}
