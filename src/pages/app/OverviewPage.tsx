import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, Filter, RefreshCw, X } from "lucide-react";
import {
  DashboardConversionHeatmap,
  DashboardFunnelPanel,
  DashboardKpiStrip,
  DashboardOriginPanel,
  DashboardPeriodComparison,
  DashboardReceitaTimeline,
  DashboardTopCampaigns,
} from "@/components/dashboard/DashboardCharts";
import { DashboardDateFilter } from "@/components/dashboard/DashboardDateFilter";
import { LeadsUtmSearchSelect } from "@/components/leads/LeadsUtmSearchSelect";
import { LeadsWhatsappFilter } from "@/components/leads/LeadsWhatsappFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import { useConta } from "@/contexts/ContaContext";
import { useLeadsInstancias } from "@/hooks/useLeadsInstancias";
import { LEAD_DETAIL_SELECT } from "@/lib/leadsConstants";
import { getCanonicalConvertedLeads } from "@/lib/leadPhone";
import {
  aggregateFunnel,
  aggregateLeadsByOrigin,
  aggregateTopCampaigns,
  buildPeriodSnapshot,
  countLeadsInSaleStage,
  DASHBOARD_PERIOD_LABELS,
  getDateRangeFromPreset,
  getLeadInstanciaId,
  getPreviousDateRange,
  heatmapMaxCount,
  isLeadInPeriod,
  leadsByDayByOrigin,
  leadsHeatmapData,
  receitaByDay,
  sumReceitaEstimada,
  type DatePreset,
} from "@/lib/leadsAnalytics";
import {
  countActiveLeadsUtmFilters,
  collectUniqueUtmValues,
  emptyLeadsUtmFilters,
  getActiveLeadsUtmFilterLabels,
  LEADS_UTM_FIELDS,
  LEADS_UTM_LABELS,
  matchesLeadsUtmFilters,
  type LeadsUtmField,
} from "@/lib/leadsUtmFilters";
import { supabase } from "@/lib/supabase";
import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

export function OverviewPage() {
  const { contaAtiva } = useConta();
  const { instancias } = useLeadsInstancias(true);
  const [cliques, setCliques] = useState<LeadsClique[]>([]);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<DatePreset>("ultimos_30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [instanciaFilter, setInstanciaFilter] = useState("all");
  const [utmFilters, setUtmFilters] = useState(emptyLeadsUtmFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersToggleRef = useRef<HTMLButtonElement>(null);
  const filtersPanelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [cRes, eRes] = await Promise.all([
      supabase
        .from("leads_cliques")
        .select(LEAD_DETAIL_SELECT)
        .eq("conta_id", contaAtiva.id)
        .order("convertido_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("leads_jornada_etapas")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("posicao"),
    ]);
    setCliques((cRes.data as LeadsClique[]) ?? []);
    setEtapas((eRes.data as LeadsJornadaEtapa[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const dateRange = useMemo(
    () =>
      getDateRangeFromPreset(
        preset,
        preset === "personalizado" ? { from: customFrom, to: customTo } : undefined
      ),
    [preset, customFrom, customTo]
  );

  const utmOptions = useMemo(() => collectUniqueUtmValues(cliques), [cliques]);

  const structuralFiltered = useMemo(
    () =>
      cliques.filter((c) => {
        if (instanciaFilter !== "all" && getLeadInstanciaId(c) !== instanciaFilter) return false;
        return matchesLeadsUtmFilters(c, utmFilters);
      }),
    [cliques, instanciaFilter, utmFilters]
  );

  const filtered = useMemo(() => {
    const { from, to } = dateRange;
    return getCanonicalConvertedLeads(structuralFiltered).filter((c) =>
      isLeadInPeriod(c, from, to)
    );
  }, [structuralFiltered, dateRange]);

  const previousRange = useMemo(() => getPreviousDateRange(dateRange), [dateRange]);

  const filteredPrevious = useMemo(() => {
    const { from, to } = previousRange;
    return getCanonicalConvertedLeads(structuralFiltered).filter((c) =>
      isLeadInPeriod(c, from, to)
    );
  }, [structuralFiltered, previousRange]);

  const metricas = useMemo(() => aggregateLeadsByOrigin(filtered), [filtered]);
  const volumeByDay = useMemo(() => leadsByDayByOrigin(filtered, dateRange), [filtered, dateRange]);
  const funnel = useMemo(() => aggregateFunnel(filtered, etapas), [filtered, etapas]);
  const topCampaigns = useMemo(() => aggregateTopCampaigns(filtered), [filtered]);
  const vendas = useMemo(() => countLeadsInSaleStage(filtered), [filtered]);
  const receita = useMemo(() => sumReceitaEstimada(filtered), [filtered]);
  const receitaTimeline = useMemo(() => receitaByDay(filtered, dateRange), [filtered, dateRange]);
  const currentSnapshot = useMemo(() => buildPeriodSnapshot(filtered), [filtered]);
  const previousSnapshot = useMemo(() => buildPeriodSnapshot(filteredPrevious), [filteredPrevious]);
  const heatmap = useMemo(() => leadsHeatmapData(filtered), [filtered]);
  const heatmapMax = useMemo(() => heatmapMaxCount(heatmap), [heatmap]);

  const previousPeriodLabel = useMemo(() => {
    const { from, to } = previousRange;
    return `${format(from, "dd/MM/yyyy", { locale: ptBR })} – ${format(to, "dd/MM/yyyy", { locale: ptBR })}`;
  }, [previousRange]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (instanciaFilter !== "all") n += 1;
    n += countActiveLeadsUtmFilters(utmFilters);
    return n;
  }, [instanciaFilter, utmFilters]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [DASHBOARD_PERIOD_LABELS[preset]];
    if (preset === "personalizado" && (customFrom || customTo)) {
      const fromLabel = customFrom
        ? format(new Date(customFrom), "dd/MM/yyyy", { locale: ptBR })
        : "…";
      const toLabel = customTo ? format(new Date(customTo), "dd/MM/yyyy", { locale: ptBR }) : "…";
      labels[0] = `${labels[0]}: ${fromLabel} – ${toLabel}`;
    }
    if (instanciaFilter !== "all") {
      const inst = instancias.find((i) => i.id === instanciaFilter);
      labels.push(inst?.nome ?? "WhatsApp");
    }
    labels.push(...getActiveLeadsUtmFilterLabels(utmFilters));
    return labels;
  }, [preset, customFrom, customTo, instanciaFilter, utmFilters, instancias]);

  const setUtmFilter = (field: LeadsUtmField, value: string) => {
    setUtmFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setInstanciaFilter("all");
    setUtmFilters(emptyLeadsUtmFilters());
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <DashboardDateFilter
          preset={preset}
          customFrom={customFrom}
          customTo={customTo}
          rangeFrom={dateRange.from}
          rangeTo={dateRange.to}
          onPresetChange={setPreset}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
          className="w-full sm:w-auto"
        />

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
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
        </div>
      </div>

      {!filtersOpen && activeFilterLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterLabels.map((label) => (
            <Badge key={label} variant="default" className="font-normal">
              {label}
            </Badge>
          ))}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          )}
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
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">UTMs</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {LEADS_UTM_FIELDS.map((field) => {
                  const options = [...utmOptions[field]];
                  const selected = utmFilters[field];
                  if (selected && !options.includes(selected)) options.unshift(selected);
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

      <div className="grid gap-5 lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-stretch">
        <DashboardKpiStrip vendas={vendas} total={metricas.total} receita={receita} />
        <DashboardOriginPanel metrics={metricas} volumeByDay={volumeByDay} />
      </div>

      <DashboardPeriodComparison
        current={currentSnapshot}
        previous={previousSnapshot}
        previousLabel={previousPeriodLabel}
      />

      <DashboardReceitaTimeline data={receitaTimeline} />

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardFunnelPanel funnel={funnel} />
        <DashboardTopCampaigns campaigns={topCampaigns} />
      </div>

      <DashboardConversionHeatmap cells={heatmap} maxCount={heatmapMax} />
    </div>
  );
}
