import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

export type DatePreset =
  | "este_mes"
  | "mes_passado"
  | "hoje"
  | "ultimos_7"
  | "ultimos_14"
  | "ultimos_30"
  | "todo"
  | "personalizado";

export const DASHBOARD_PERIOD_LABELS: Record<DatePreset, string> = {
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  hoje: "Hoje",
  ultimos_7: "7 dias",
  ultimos_14: "14 dias",
  ultimos_30: "30 dias",
  todo: "Todo período",
  personalizado: "Personalizado",
};

export const DASHBOARD_QUICK_DATE_PRESETS: DatePreset[] = ["ultimos_7", "ultimos_14", "ultimos_30"];

export const DASHBOARD_EXTRA_DATE_PRESETS: DatePreset[] = [
  "este_mes",
  "mes_passado",
  "hoje",
  "todo",
];

export interface DateRange {
  from: Date;
  to: Date;
}

function toDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayKeyFromDate(d: Date): { date: string; sortKey: number } {
  const date = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  const sortKey = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return { date, sortKey };
}

export function eachDayInRange(range: DateRange): { date: string; sortKey: number }[] {
  const days: { date: string; sortKey: number }[] = [];
  const cur = toDayStart(range.from);
  const end = toDayStart(range.to);

  while (cur <= end) {
    days.push(dayKeyFromDate(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return days;
}

export function getDateRangeFromPreset(
  preset: DatePreset,
  custom?: { from?: string; to?: string }
): DateRange {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "hoje":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "ultimos_7": {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "ultimos_14": {
      const from = new Date(now);
      from.setDate(from.getDate() - 13);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "ultimos_30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "mes_passado": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case "todo":
      return { from: new Date(2000, 0, 1), to: endOfDay(now) };
    case "personalizado": {
      const from = custom?.from ? startOfDay(new Date(custom.from)) : startOfDay(now);
      const to = custom?.to ? endOfDay(new Date(custom.to)) : endOfDay(now);
      return { from, to };
    }
    case "este_mes":
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: endOfDay(now) };
    }
  }
}

export function isMetaOrigin(c: LeadsClique): boolean {
  return Boolean(
    c.fbp ||
      c.fbc ||
      c.fbclid ||
      (c.utm_campaign && c.utm_campaign.length > 0) ||
      (c.utm_content && c.utm_content.length > 0) ||
      (c.utm_medium && /facebook|meta|fb|instagram|ig/i.test(c.utm_medium))
  );
}

export function isGoogleOrigin(c: LeadsClique): boolean {
  if (isMetaOrigin(c)) return false;
  if (c.gclid) return true;

  const blob = [c.utm_source, c.utm_medium, c.utm_campaign, c.utm_content]
    .filter(Boolean)
    .join(" ");

  return /google|googleads|adwords|gads|youtube|goog/i.test(blob);
}

export function hasLeadTracking(c: LeadsClique): boolean {
  return Boolean(
    c.utm_source ||
      c.utm_medium ||
      c.utm_campaign ||
      c.utm_content ||
      c.utm_term ||
      c.fbclid ||
      c.gclid ||
      c.ttclid ||
      c.fbp ||
      c.fbc ||
      c.referrer
  );
}

export type LeadOriginCategory = "meta" | "google" | "outras" | "sem_rastreio";

export const LEAD_ORIGIN_LABELS: Record<LeadOriginCategory, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  outras: "Outras origens",
  sem_rastreio: "Sem rastreio",
};

export function getLeadOriginCategory(c: LeadsClique): LeadOriginCategory {
  if (isMetaOrigin(c)) return "meta";
  if (isGoogleOrigin(c)) return "google";
  if (hasLeadTracking(c)) return "outras";
  return "sem_rastreio";
}

export interface LeadsOriginMetrics {
  total: number;
  meta: number;
  google: number;
  outras: number;
  semRastreio: number;
}

export function aggregateLeadsByOrigin(leads: LeadsClique[]): LeadsOriginMetrics {
  const metrics: LeadsOriginMetrics = {
    total: leads.length,
    meta: 0,
    google: 0,
    outras: 0,
    semRastreio: 0,
  };

  for (const lead of leads) {
    const category = getLeadOriginCategory(lead);
    if (category === "meta") metrics.meta += 1;
    else if (category === "google") metrics.google += 1;
    else if (category === "outras") metrics.outras += 1;
    else metrics.semRastreio += 1;
  }

  return metrics;
}

export function getOriginLabel(c: LeadsClique): string {
  const category = getLeadOriginCategory(c);
  if (category === "meta") return LEAD_ORIGIN_LABELS.meta;
  if (category === "google") return LEAD_ORIGIN_LABELS.google;
  if (category === "outras") {
    if (c.utm_source || c.utm_campaign) {
      const parts = [c.utm_source, c.utm_campaign].filter(Boolean);
      return parts.join(" / ") || LEAD_ORIGIN_LABELS.outras;
    }
    return LEAD_ORIGIN_LABELS.outras;
  }
  if (!c.link_id) return "WhatsApp direto";
  return LEAD_ORIGIN_LABELS.sem_rastreio;
}

export interface DashboardFilters {
  instanciaId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

export function getLeadInstanciaId(c: LeadsClique): string | null {
  return c.instancia_id ?? c.leads_links?.instancia_id ?? null;
}

export function isLeadInPeriod(c: LeadsClique, from: Date, to: Date): boolean {
  const ref = c.convertido_at ?? c.created_at;
  const d = new Date(ref);
  return d >= from && d <= to;
}

export function aggregateTopCampaigns(
  cliques: LeadsClique[],
  limit = 8
): { nome: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of cliques) {
    const nome = c.leads_links?.nome ?? "WhatsApp direto";
    map.set(nome, (map.get(nome) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function countLeadsInSaleStage(cliques: LeadsClique[]): number {
  return cliques.filter((c) => c.leads_jornada_etapas?.representa_venda).length;
}

export const LEADS_ORIGIN_CHART_COLORS = {
  meta: "#0081FB",
  google: "#22c55e",
  outras: "#7c3aed",
  semRastreio: "#64748b",
} as const;

export const LEADS_ORIGIN_STACK_SERIES = [
  { key: "meta", name: "Meta Ads", color: LEADS_ORIGIN_CHART_COLORS.meta },
  { key: "google", name: "Google Ads", color: LEADS_ORIGIN_CHART_COLORS.google },
  { key: "outras", name: "Outras origens", color: LEADS_ORIGIN_CHART_COLORS.outras },
  { key: "semRastreio", name: "Sem rastreio", color: LEADS_ORIGIN_CHART_COLORS.semRastreio },
] as const;

export interface LeadsByDayOriginRow {
  date: string;
  sortKey: number;
  meta: number;
  google: number;
  outras: number;
  semRastreio: number;
  total: number;
}

export function originMetricsToChartData(metrics: LeadsOriginMetrics) {
  return [
    { name: "Meta Ads", value: metrics.meta, color: LEADS_ORIGIN_CHART_COLORS.meta },
    { name: "Google Ads", value: metrics.google, color: LEADS_ORIGIN_CHART_COLORS.google },
    { name: "Outras origens", value: metrics.outras, color: LEADS_ORIGIN_CHART_COLORS.outras },
    { name: "Sem rastreio", value: metrics.semRastreio, color: LEADS_ORIGIN_CHART_COLORS.semRastreio },
  ];
}

export function getPreviousDateRange(range: DateRange): DateRange {
  const lengthMs = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - lengthMs);
  return { from: prevFrom, to: prevTo };
}

export function sumReceitaEstimada(cliques: LeadsClique[]): number {
  let total = 0;
  for (const c of cliques) {
    if (!c.leads_jornada_etapas?.representa_venda) continue;
    const valor = c.valor_venda != null
      ? Number(c.valor_venda)
      : c.leads_jornada_etapas.valor_venda != null
        ? Number(c.leads_jornada_etapas.valor_venda)
        : null;
    if (valor != null && !Number.isNaN(valor)) total += valor;
  }
  return total;
}

export interface PeriodSnapshot {
  leads: number;
  vendas: number;
  receita: number;
  meta: number;
  google: number;
}

export function buildPeriodSnapshot(cliques: LeadsClique[]): PeriodSnapshot {
  const metrics = aggregateLeadsByOrigin(cliques);
  return {
    leads: cliques.length,
    vendas: countLeadsInSaleStage(cliques),
    receita: sumReceitaEstimada(cliques),
    meta: metrics.meta,
    google: metrics.google,
  };
}

export const HEATMAP_DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
export const HEATMAP_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const HEATMAP_HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

export interface HeatmapCell {
  dayLabel: string;
  hour: number;
  count: number;
}

export function leadsHeatmapData(cliques: LeadsClique[]): HeatmapCell[] {
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));

  for (const c of cliques) {
    const d = new Date(c.convertido_at ?? c.created_at);
    matrix[d.getDay()][d.getHours()] += 1;
  }

  const cells: HeatmapCell[] = [];
  for (let row = 0; row < HEATMAP_DAY_ORDER.length; row++) {
    const dayIndex = HEATMAP_DAY_ORDER[row];
    for (const hour of HEATMAP_HOURS) {
      cells.push({
        dayLabel: HEATMAP_DAY_LABELS[row],
        hour,
        count: matrix[dayIndex][hour],
      });
    }
  }
  return cells;
}

export function heatmapMaxCount(cells: HeatmapCell[]): number {
  return cells.reduce((max, c) => Math.max(max, c.count), 0);
}

export function receitaByDay(
  cliques: LeadsClique[],
  range?: DateRange
): { date: string; receita: number; sortKey: number }[] {
  const map = new Map<string, { receita: number; sortKey: number }>();

  for (const c of cliques) {
    if (!c.leads_jornada_etapas?.representa_venda) continue;
    const valor = c.valor_venda != null
      ? Number(c.valor_venda)
      : c.leads_jornada_etapas.valor_venda != null
        ? Number(c.leads_jornada_etapas.valor_venda)
        : null;
    if (valor == null || Number.isNaN(valor)) continue;

    const ref = c.convertido_at ?? c.created_at;
    const { date, sortKey } = dayKeyFromDate(new Date(ref));
    const prev = map.get(date);
    map.set(date, { receita: (prev?.receita ?? 0) + valor, sortKey });
  }

  if (range) {
    for (const { date, sortKey } of eachDayInRange(range)) {
      if (!map.has(date)) map.set(date, { receita: 0, sortKey });
    }
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, receita: v.receita, sortKey: v.sortKey }))
    .sort((a, b) => a.sortKey - b.sortKey);
}

export function filterLeadsForDashboard(
  cliques: LeadsClique[],
  range: DateRange,
  filters: DashboardFilters
): LeadsClique[] {
  return cliques.filter((c) => {
    if (c.status !== "convertido") return false;

    const refDate = c.convertido_at ?? c.created_at;
    const d = new Date(refDate);
    if (d < range.from || d > range.to) return false;

    if (filters.instanciaId !== "all") {
      const instId = getLeadInstanciaId(c);
      if (instId !== filters.instanciaId) return false;
    }

    const match = (field: string | null | undefined, filter: string) => {
      if (!filter.trim()) return true;
      return (field ?? "").toLowerCase().includes(filter.trim().toLowerCase());
    };

    return (
      match(c.utm_source, filters.utmSource) &&
      match(c.utm_medium, filters.utmMedium) &&
      match(c.utm_campaign, filters.utmCampaign) &&
      match(c.utm_content, filters.utmContent) &&
      match(c.utm_term, filters.utmTerm)
    );
  });
}

export function aggregateFunnel(
  cliques: LeadsClique[],
  etapas: LeadsJornadaEtapa[]
): { nome: string; count: number; representa_venda: boolean }[] {
  const byName = new Map<string, { count: number; representa_venda: boolean }>();

  for (const c of cliques) {
    const etapaId = c.etapa_id;
    let nome = "Sem etapa";
    let representa_venda = false;

    if (etapaId) {
      const etapa = etapas.find((e) => e.id === etapaId);
      if (etapa) {
        nome = etapa.nome;
        representa_venda = etapa.representa_venda;
      }
    } else {
      const instId = getLeadInstanciaId(c);
      const primeiro = etapas.find((e) => e.instancia_id === instId && e.primeiro_contato);
      if (primeiro) {
        nome = primeiro.nome;
        representa_venda = primeiro.representa_venda;
      }
    }

    const prev = byName.get(nome) ?? { count: 0, representa_venda };
    byName.set(nome, { count: prev.count + 1, representa_venda: prev.representa_venda || representa_venda });
  }

  const orderedStages: { nome: string; representa_venda: boolean }[] = [];
  const seen = new Set<string>();
  for (const e of [...etapas].sort((a, b) => a.posicao - b.posicao)) {
    if (seen.has(e.nome)) continue;
    seen.add(e.nome);
    orderedStages.push({ nome: e.nome, representa_venda: e.representa_venda });
  }

  const result = orderedStages.map(({ nome, representa_venda }) => {
    const entry = byName.get(nome);
    return {
      nome,
      count: entry?.count ?? 0,
      representa_venda: entry?.representa_venda ?? representa_venda,
    };
  });

  const semEtapa = byName.get("Sem etapa");
  if (semEtapa && semEtapa.count > 0) {
    result.push({ nome: "Sem etapa", count: semEtapa.count, representa_venda: false });
  }

  return result;
}

export function leadsByDay(
  cliques: LeadsClique[],
  range?: DateRange
): { date: string; count: number; sortKey: number }[] {
  const map = new Map<string, { count: number; sortKey: number }>();
  for (const c of cliques) {
    const ref = c.convertido_at ?? c.created_at;
    const { date, sortKey } = dayKeyFromDate(new Date(ref));
    const prev = map.get(date);
    map.set(date, { count: (prev?.count ?? 0) + 1, sortKey });
  }

  if (range) {
    for (const { date, sortKey } of eachDayInRange(range)) {
      if (!map.has(date)) map.set(date, { count: 0, sortKey });
    }
  }

  return Array.from(map.entries())
    .map(([date, v]) => ({ date, count: v.count, sortKey: v.sortKey }))
    .sort((a, b) => a.sortKey - b.sortKey);
}

export function leadsByDayByOrigin(cliques: LeadsClique[], range?: DateRange): LeadsByDayOriginRow[] {
  const map = new Map<string, LeadsByDayOriginRow>();

  for (const c of cliques) {
    const ref = c.convertido_at ?? c.created_at;
    const { date, sortKey } = dayKeyFromDate(new Date(ref));

    let row = map.get(date);
    if (!row) {
      row = { date, sortKey, meta: 0, google: 0, outras: 0, semRastreio: 0, total: 0 };
      map.set(date, row);
    }

    const category = getLeadOriginCategory(c);
    if (category === "meta") row.meta += 1;
    else if (category === "google") row.google += 1;
    else if (category === "outras") row.outras += 1;
    else row.semRastreio += 1;
    row.total += 1;
  }

  if (range) {
    for (const { date, sortKey } of eachDayInRange(range)) {
      if (!map.has(date)) {
        map.set(date, { date, sortKey, meta: 0, google: 0, outras: 0, semRastreio: 0, total: 0 });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
}

export function extractPhoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return String(phone).split("@")[0].replace(/\D/g, "");
}

/** Remove DDI 55 quando o número já inclui código do país. */
export function normalizeBrazilPhoneNational(digits: string): string {
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
}

export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return "Aguardando";

  const national = normalizeBrazilPhoneNational(extractPhoneDigits(phone));

  if (national.length === 11) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  }
  if (national.length === 10) {
    return `(${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  if (national.length === 9) {
    return `${national.slice(0, 5)}-${national.slice(5)}`;
  }
  if (national.length === 8) {
    return `${national.slice(0, 4)}-${national.slice(4)}`;
  }

  const raw = String(phone).split("@")[0].trim();
  return raw || phone;
}

export function stripInvisibleChars(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, "");
}
