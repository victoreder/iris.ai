import { Fragment } from "react";
import { ChevronDown, DollarSign, TrendingDown, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadsOriginMetricsCards } from "@/components/leads/LeadsOriginMetricsCards";
import type { LeadsByDayOriginRow, LeadsOriginMetrics, PeriodSnapshot } from "@/lib/leadsAnalytics";
import {
  HEATMAP_DAY_LABELS,
  HEATMAP_HOURS,
  LEADS_ORIGIN_STACK_SERIES,
  type HeatmapCell,
} from "@/lib/leadsAnalytics";
import { formatValorVendaBR } from "@/lib/leadValorVenda";
import { funnelStepWidth } from "@/lib/funnelLayout";
import { cn } from "@/lib/utils";

const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
};

interface FunnelItem {
  nome: string;
  count: number;
  representa_venda: boolean;
}

export function DashboardOriginPanel({
  metrics,
  volumeByDay,
}: {
  metrics: LeadsOriginMetrics;
  volumeByDay: LeadsByDayOriginRow[];
}) {
  const stackSeries = LEADS_ORIGIN_STACK_SERIES;
  const lastSeriesKey = stackSeries[stackSeries.length - 1].key;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Volume de leads</CardTitle>
        <p className="text-xs text-muted-foreground">Leads por dia, acumulados por origem</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <LeadsOriginMetricsCards metrics={metrics} hideTotal />

        {volumeByDay.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Sem dias no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeByDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" />
              {stackSeries.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.name}
                  stackId="origem"
                  fill={series.color}
                  maxBarSize={48}
                  radius={series.key === lastSeriesKey ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                >
                  <LabelList
                    dataKey={series.key}
                    position="center"
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight={600}
                    formatter={(value: number) => (value > 0 ? String(value) : "")}
                  />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
export function DashboardFunnelPanel({ funnel }: { funnel: FunnelItem[] }) {
  const steps = funnel.map((step, journeyIndex) => ({ ...step, journeyIndex }));
  const topCount = steps[0]?.count ?? 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Jornada</CardTitle>
        <p className="text-xs text-muted-foreground">Leads em cada etapa da jornada no período</p>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma etapa configurada</p>
        ) : (
          <div className="flex flex-col items-center py-2">
            {steps.map((step, idx) => {
              const widthPct = funnelStepWidth(idx, steps.length);
              const shareTop = topCount > 0 ? Math.round((step.count / topCount) * 100) : 0;
              const prevCount = idx > 0 ? steps[idx - 1].count : 0;
              const sharePrev =
                idx > 0 && prevCount > 0 ? Math.round((step.count / prevCount) * 100) : null;

              return (
                <div key={step.nome} className="flex w-full flex-col items-center">
                  {idx > 0 && (
                    <div className="flex flex-col items-center py-1 text-muted-foreground">
                      <ChevronDown className="h-5 w-5" />
                    </div>
                  )}

                  <div
                    className="relative transition-[width] duration-300"
                    style={{ width: `${widthPct}%`, minWidth: "min(100%, 16rem)" }}
                  >
                    <div
                      className={cn(
                        "overflow-hidden rounded-lg border bg-card shadow-sm",
                        step.count === 0 ? "border-dashed border-border/80 opacity-75" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {step.journeyIndex + 1}
                            </span>
                            <span className="truncate font-semibold">{step.nome}</span>
                            {step.representa_venda && (
                              <DollarSign className="h-4 w-4 shrink-0 text-success" />
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {idx > 0 && sharePrev != null && (
                              <span>{sharePrev}% da etapa anterior</span>
                            )}
                            {topCount > 0 && idx > 0 && <span>{shareTop}% do topo</span>}
                          </div>
                        </div>
                        <p
                          className={cn(
                            "shrink-0 text-2xl font-bold tabular-nums",
                            step.count === 0 ? "text-muted-foreground" : "text-foreground"
                          )}
                        >
                          {step.count.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardTopCampaigns({
  campaigns,
}: {
  campaigns: { nome: string; count: number }[];
}) {
  const max = campaigns[0]?.count ?? 1;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top links rastreáveis</CardTitle>
        <p className="text-xs text-muted-foreground">Links de captura com mais leads convertidos</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem links rastreáveis no período</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.nome}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{c.nome}</span>
                <span className="shrink-0 font-semibold tabular-nums">{c.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${Math.max(4, (c.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardKpiStrip({
  vendas,
  total,
  receita,
}: {
  vendas: number;
  total: number;
  receita: number;
}) {
  const taxa = total > 0 ? Math.round((vendas / total) * 100) : 0;

  return (
    <div data-tour="dashboard-kpis" className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total de leads</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{total}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">No período filtrado</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendas</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{vendas}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{taxa}% do total de leads</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Taxa de Conversão</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{taxa}%</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {vendas} de {total} leads
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between pt-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Faturamento</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
              {formatValorVendaBR(receita)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Soma das vendas no período</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = pctChange(current, previous);
  if (change === null) {
    return <span className="text-xs font-medium text-success">Novo</span>;
  }
  if (change === 0) {
    return <span className="text-xs text-muted-foreground">= 0%</span>;
  }
  const up = change > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        up ? "text-success" : "text-destructive"
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}
      {change}%
    </span>
  );
}

export function DashboardPeriodComparison({
  current,
  previous,
  previousLabel,
}: {
  current: PeriodSnapshot;
  previous: PeriodSnapshot;
  previousLabel: string;
}) {
  const chartData = [
    { metric: "Total de leads", atual: current.leads, anterior: previous.leads },
    { metric: "Vendas", atual: current.vendas, anterior: previous.vendas },
    { metric: "Faturamento", atual: current.receita, anterior: previous.receita },
  ];

  const rows = [
    { label: "Total de leads", current: current.leads, previous: previous.leads, format: (v: number) => String(v) },
    { label: "Vendas", current: current.vendas, previous: previous.vendas, format: (v: number) => String(v) },
    { label: "Faturamento", current: current.receita, previous: previous.receita, format: formatValorVendaBR },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Comparativo com período anterior</CardTitle>
        <p className="text-xs text-muted-foreground">Período anterior: {previousLabel}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 font-medium">Métrica</th>
                <th className="pb-2 font-medium">Período atual</th>
                <th className="pb-2 font-medium">Período anterior</th>
                <th className="pb-2 font-medium">Variação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 text-muted-foreground">{row.label}</td>
                  <td className="py-2.5 font-semibold tabular-nums">{row.format(row.current)}</td>
                  <td className="py-2.5 tabular-nums text-muted-foreground">{row.format(row.previous)}</td>
                  <td className="py-2.5">
                    <ChangeBadge current={row.current} previous={row.previous} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="atual" name="Período atual" fill="#3F37FF" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="anterior" name="Período anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardReceitaTimeline({
  data,
}: {
  data: { date: string; receita: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Receita estimada por dia</CardTitle>
        <p className="text-xs text-muted-foreground">Valor acumulado por dia em etapas de venda</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Sem dias no período</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                }
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number) => [formatValorVendaBR(value), "Receita"]}
              />
              <Line
                type="monotone"
                dataKey="receita"
                name="Receita"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3, fill: "#22c55e" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function heatmapColor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "rgb(241 245 249)";
  const intensity = count / max;
  if (intensity < 0.25) return "rgb(219 234 254)";
  if (intensity < 0.5) return "rgb(147 197 253)";
  if (intensity < 0.75) return "rgb(59 130 246)";
  return "rgb(63 55 255)";
}

export function DashboardConversionHeatmap({
  cells,
  maxCount,
}: {
  cells: HeatmapCell[];
  maxCount: number;
}) {
  const cellMap = new Map(cells.map((c) => [`${c.dayLabel}-${c.hour}`, c.count]));
  const hasData = cells.some((c) => c.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Heatmap de conversões</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dia da semana × horário (8h–22h) — quando os leads entram
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Sem dados no período</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `48px repeat(${HEATMAP_HOURS.length}, minmax(0, 1fr))` }}
              >
                <div />
                {HEATMAP_HOURS.map((h) => (
                  <div key={h} className="text-center text-[10px] text-muted-foreground">
                    {h}h
                  </div>
                ))}
                {HEATMAP_DAY_LABELS.map((day) => (
                  <Fragment key={day}>
                    <div className="flex items-center text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                    {HEATMAP_HOURS.map((hour) => {
                      const count = cellMap.get(`${day}-${hour}`) ?? 0;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          title={`${day} ${hour}h: ${count} lead(s)`}
                          className="aspect-square min-h-[28px] rounded-sm border border-border/40 transition-colors"
                          style={{ backgroundColor: heatmapColor(count, maxCount) }}
                        />
                      );
                    })}
                  </Fragment>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  {[0, 0.25, 0.5, 0.75, 1].map((i) => (
                    <div
                      key={i}
                      className="h-3 w-6 rounded-sm border border-border/40"
                      style={{ backgroundColor: heatmapColor(i * maxCount || 0, maxCount || 1) }}
                    />
                  ))}
                </div>
                <span>Mais</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
