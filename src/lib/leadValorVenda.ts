import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

export function resolveLeadValorVenda(
  lead: Pick<LeadsClique, "valor_venda" | "leads_jornada_etapas">,
  etapa?: Pick<LeadsJornadaEtapa, "valor_venda"> | null
): number | null {
  if (lead.valor_venda != null) return Number(lead.valor_venda);
  if (etapa?.valor_venda != null) return Number(etapa.valor_venda);
  if (lead.leads_jornada_etapas?.valor_venda != null) {
    return Number(lead.leads_jornada_etapas.valor_venda);
  }
  return null;
}

export function formatValorVendaBR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseValorVendaInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (Number.isNaN(num) || num < 0) return null;
  return num;
}
