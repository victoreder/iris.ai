import {
  emptyLeadsUtmFilters,
  type LeadsUtmFilters,
} from "@/lib/leadsUtmFilters";

export const LEADS_INBOX_PERIODS = ["hoje", "ultimos_7", "ultimos_30", "todo"] as const;
export type LeadsInboxPeriod = (typeof LEADS_INBOX_PERIODS)[number];

export interface LeadsInboxFiltersCache {
  period: LeadsInboxPeriod;
  instanciaFilter: string;
  linkFilter: string;
  telefoneFilter: string;
  utm: LeadsUtmFilters;
}

const STORAGE_PREFIX = "viziom-leads-filters";

export function leadsInboxFiltersStorageKey(contaId: string): string {
  return `${STORAGE_PREFIX}-${contaId}`;
}

function isLeadsInboxPeriod(value: unknown): value is LeadsInboxPeriod {
  return typeof value === "string" && (LEADS_INBOX_PERIODS as readonly string[]).includes(value);
}

function normalizeUtm(value: unknown): LeadsUtmFilters {
  const empty = emptyLeadsUtmFilters();
  if (!value || typeof value !== "object") return empty;
  const raw = value as Record<string, unknown>;
  return {
    utm_source: typeof raw.utm_source === "string" ? raw.utm_source : "",
    utm_medium: typeof raw.utm_medium === "string" ? raw.utm_medium : "",
    utm_campaign: typeof raw.utm_campaign === "string" ? raw.utm_campaign : "",
    utm_content: typeof raw.utm_content === "string" ? raw.utm_content : "",
    utm_term: typeof raw.utm_term === "string" ? raw.utm_term : "",
  };
}

export function loadLeadsInboxFilters(contaId: string): LeadsInboxFiltersCache | null {
  try {
    const raw = localStorage.getItem(leadsInboxFiltersStorageKey(contaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      period: isLeadsInboxPeriod(parsed.period) ? parsed.period : "ultimos_30",
      instanciaFilter: typeof parsed.instanciaFilter === "string" ? parsed.instanciaFilter : "all",
      linkFilter: typeof parsed.linkFilter === "string" ? parsed.linkFilter : "all",
      telefoneFilter: typeof parsed.telefoneFilter === "string" ? parsed.telefoneFilter : "",
      utm: normalizeUtm(parsed.utm),
    };
  } catch {
    return null;
  }
}

export function saveLeadsInboxFilters(contaId: string, filters: LeadsInboxFiltersCache): void {
  localStorage.setItem(leadsInboxFiltersStorageKey(contaId), JSON.stringify(filters));
}
