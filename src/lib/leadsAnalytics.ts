import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

export type DatePreset =
  | "este_mes"
  | "mes_passado"
  | "hoje"
  | "ultimos_7"
  | "ultimos_30"
  | "todo"
  | "personalizado";

export interface DateRange {
  from: Date;
  to: Date;
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

export function getOriginLabel(c: LeadsClique): string {
  if (isMetaOrigin(c)) return "Meta Ads";
  if (c.utm_source || c.utm_campaign) {
    const parts = [c.utm_source, c.utm_campaign].filter(Boolean);
    return parts.join(" / ") || "Campanha";
  }
  if (!c.link_id) return "WhatsApp direto";
  if (!c.utm_source && !c.utm_campaign && !c.referrer) return "Sem origem";
  return "Outros";
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

  return Array.from(byName.entries())
    .map(([nome, v]) => ({ nome, count: v.count, representa_venda: v.representa_venda }))
    .sort((a, b) => b.count - a.count);
}

export function leadsByDay(cliques: LeadsClique[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const c of cliques) {
    const ref = c.convertido_at ?? c.created_at;
    const d = new Date(ref);
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return "Aguardando";
  const d = phone.replace(/\D/g, "");
  if (d.length >= 11) {
    const tail = d.slice(-11);
    return `(${tail.slice(0, 2)}) ${tail.slice(2, 7)}-${tail.slice(7)}`;
  }
  return phone;
}

export function stripInvisibleChars(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, "");
}
