export type LeadDetailTab = "geral" | "jornada" | "conversa";

export const LEAD_DETAIL_TABS: { key: LeadDetailTab; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "jornada", label: "Jornada" },
  { key: "conversa", label: "Conversa" },
];

export function parseLeadDetailTab(value: string | null): LeadDetailTab {
  if (value === "jornada" || value === "conversa") return value;
  return "geral";
}
