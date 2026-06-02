export const LEADS_TABLE_COLUMNS_STORAGE_PREFIX = "viziom-leads-table-columns";

export function leadsTableColumnsStorageKey(contaId: string): string {
  return `${LEADS_TABLE_COLUMNS_STORAGE_PREFIX}-${contaId}`;
}

export type LeadsTableColumnKey =
  | "contato"
  | "etapa"
  | "campanha"
  | "origem"
  | "entrada"
  | "dispositivo"
  | "valor_venda"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "fbclid"
  | "gclid"
  | "ip_address"
  | "fbp"
  | "fbc"
  | "referrer"
  | "landing_url";

export const LEADS_TABLE_COLUMN_ORDER: LeadsTableColumnKey[] = [
  "contato",
  "etapa",
  "campanha",
  "origem",
  "entrada",
  "dispositivo",
  "valor_venda",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
  "ip_address",
  "fbp",
  "fbc",
  "referrer",
  "landing_url",
];

export const DEFAULT_LEADS_TABLE_COLUMNS: LeadsTableColumnKey[] = [
  "contato",
  "etapa",
  "campanha",
  "origem",
  "entrada",
];

export const LEADS_TABLE_COLUMN_LABELS: Record<LeadsTableColumnKey, string> = {
  contato: "Contato",
  etapa: "Etapa",
  campanha: "Link rastreável",
  origem: "Origem",
  entrada: "Entrada como lead",
  dispositivo: "Dispositivo",
  valor_venda: "Valor da venda",
  utm_source: "UTM Source",
  utm_medium: "UTM Medium",
  utm_campaign: "UTM Campaign",
  utm_content: "UTM Content",
  utm_term: "UTM Term",
  fbclid: "fbclid",
  gclid: "gclid",
  ip_address: "IP",
  fbp: "fbp",
  fbc: "fbc",
  referrer: "Referrer",
  landing_url: "Landing URL",
};

export const LEADS_TABLE_COLUMN_GROUPS: { title: string; keys: LeadsTableColumnKey[] }[] = [
  {
    title: "Informações",
    keys: ["contato", "etapa", "campanha", "origem", "entrada", "dispositivo", "valor_venda"],
  },
  {
    title: "UTMs",
    keys: ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"],
  },
  {
    title: "Rastreio avançado",
    keys: ["fbclid", "gclid", "ip_address", "fbp", "fbc", "referrer", "landing_url"],
  },
];

const VALID_KEYS = new Set<string>(LEADS_TABLE_COLUMN_ORDER);

export function isLeadsTableColumnKey(value: string): value is LeadsTableColumnKey {
  return VALID_KEYS.has(value);
}

export function normalizeLeadsTableColumns(columns: unknown): LeadsTableColumnKey[] {
  if (!Array.isArray(columns)) return [...DEFAULT_LEADS_TABLE_COLUMNS];
  const seen = new Set<LeadsTableColumnKey>();
  const normalized: LeadsTableColumnKey[] = [];
  for (const item of columns) {
    if (typeof item !== "string" || !isLeadsTableColumnKey(item) || seen.has(item)) continue;
    seen.add(item);
    normalized.push(item);
  }
  return normalized.length > 0 ? normalized : [...DEFAULT_LEADS_TABLE_COLUMNS];
}

export function orderLeadsTableColumns(columns: LeadsTableColumnKey[]): LeadsTableColumnKey[] {
  const set = new Set(columns);
  return LEADS_TABLE_COLUMN_ORDER.filter((key) => set.has(key));
}

export function loadSavedLeadsTableColumns(contaId: string): LeadsTableColumnKey[] | null {
  try {
    const raw = localStorage.getItem(leadsTableColumnsStorageKey(contaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeLeadsTableColumns(parsed);
  } catch {
    return null;
  }
}

export function saveLeadsTableColumns(contaId: string, columns: LeadsTableColumnKey[]): void {
  const ordered = orderLeadsTableColumns(columns);
  localStorage.setItem(leadsTableColumnsStorageKey(contaId), JSON.stringify(ordered));
}
