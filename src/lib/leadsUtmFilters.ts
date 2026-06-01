import type { LeadsClique } from "@/types/database";

export type LeadsUtmField =
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term";

export const LEADS_UTM_FIELDS: LeadsUtmField[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

export const LEADS_UTM_LABELS: Record<LeadsUtmField, string> = {
  utm_source: "Source",
  utm_medium: "Medium",
  utm_campaign: "Campaign",
  utm_content: "Content",
  utm_term: "Term",
};

export interface LeadsUtmFilters {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
}

export function emptyLeadsUtmFilters(): LeadsUtmFilters {
  return {
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
  };
}

export function parseLeadsUtmFiltersFromSearch(params: URLSearchParams): LeadsUtmFilters {
  return {
    utm_source: params.get("utm_source")?.trim() ?? "",
    utm_medium: params.get("utm_medium")?.trim() ?? "",
    utm_campaign: params.get("utm_campaign")?.trim() ?? "",
    utm_content: params.get("utm_content")?.trim() ?? "",
    utm_term: params.get("utm_term")?.trim() ?? "",
  };
}

export function buildLeadsListUrlWithUtm(contaRef: string, field: LeadsUtmField, value: string): string {
  const params = new URLSearchParams();
  params.set(field, value);
  return `/app/${contaRef}/leads?${params.toString()}`;
}

export function countActiveLeadsUtmFilters(filters: LeadsUtmFilters): number {
  return LEADS_UTM_FIELDS.filter((f) => Boolean(filters[f]?.trim())).length;
}

export function getActiveLeadsUtmFilterLabels(filters: LeadsUtmFilters): string[] {
  return LEADS_UTM_FIELDS.filter((f) => filters[f]?.trim()).map(
    (f) => `${LEADS_UTM_LABELS[f]}: ${filters[f]}`
  );
}

export function matchesLeadsUtmFilters(c: LeadsClique, filters: LeadsUtmFilters): boolean {
  const exact = (field: string | null | undefined, filter: string) => {
    if (!filter) return true;
    return (field ?? "") === filter;
  };

  return (
    exact(c.utm_source, filters.utm_source) &&
    exact(c.utm_medium, filters.utm_medium) &&
    exact(c.utm_campaign, filters.utm_campaign) &&
    exact(c.utm_content, filters.utm_content) &&
    exact(c.utm_term, filters.utm_term)
  );
}

export function stripLeadsUtmParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const field of LEADS_UTM_FIELDS) {
    next.delete(field);
  }
  return next;
}

export function setLeadsUtmFilterInSearchParams(
  params: URLSearchParams,
  field: LeadsUtmField,
  value: string
): URLSearchParams {
  const next = new URLSearchParams(params);
  const trimmed = value.trim();
  if (trimmed) next.set(field, trimmed);
  else next.delete(field);
  return next;
}

export function collectUniqueUtmValues(cliques: LeadsClique[]): Record<LeadsUtmField, string[]> {
  const sets = Object.fromEntries(
    LEADS_UTM_FIELDS.map((f) => [f, new Set<string>()])
  ) as Record<LeadsUtmField, Set<string>>;

  for (const c of cliques) {
    for (const field of LEADS_UTM_FIELDS) {
      const value = c[field]?.trim();
      if (value) sets[field].add(value);
    }
  }

  return Object.fromEntries(
    LEADS_UTM_FIELDS.map((f) => [
      f,
      Array.from(sets[f]).sort((a, b) => a.localeCompare(b, "pt-BR")),
    ])
  ) as Record<LeadsUtmField, string[]>;
}
