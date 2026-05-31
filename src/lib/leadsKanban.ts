import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";
import { getLeadInstanciaId } from "./leadsAnalytics";

export const CLIQUES_COLUMN_ID = "__cliques__";

export interface KanbanColumn {
  id: string;
  title: string;
  leads: LeadsClique[];
  representa_venda?: boolean;
}

export function filterLeadsByInstancia(cliques: LeadsClique[], instanciaId: string): LeadsClique[] {
  return cliques.filter((c) => getLeadInstanciaId(c) === instanciaId);
}

export function resolveKanbanColumnId(
  lead: LeadsClique,
  etapas: LeadsJornadaEtapa[]
): string {
  if (lead.etapa_id) return lead.etapa_id;

  const instId = getLeadInstanciaId(lead);
  const primeiro = etapas.find((e) => e.instancia_id === instId && e.primeiro_contato);
  return primeiro?.id ?? etapas.find((e) => e.instancia_id === instId)?.id ?? CLIQUES_COLUMN_ID;
}

export function buildKanbanColumns(
  etapas: LeadsJornadaEtapa[],
  instanciaId: string
): Omit<KanbanColumn, "leads">[] {
  return etapas
    .filter((e) => e.instancia_id === instanciaId)
    .sort((a, b) => a.posicao - b.posicao)
    .map((e) => ({
      id: e.id,
      title: e.nome,
      representa_venda: e.representa_venda,
    }));
}

export function filterConvertedLeads(cliques: LeadsClique[]): LeadsClique[] {
  return cliques.filter((c) => c.status === "convertido");
}

export function groupLeadsByKanbanColumn(
  cliques: LeadsClique[],
  etapas: LeadsJornadaEtapa[],
  instanciaId: string
): KanbanColumn[] {
  const filtered = filterConvertedLeads(filterLeadsByInstancia(cliques, instanciaId));
  const columns = buildKanbanColumns(etapas, instanciaId).map((c) => ({
    ...c,
    leads: [] as LeadsClique[],
  }));

  if (columns.length === 0) return [];

  for (const lead of filtered) {
    const colId = resolveKanbanColumnId(lead, etapas);
    const col = columns.find((c) => c.id === colId) ?? columns[0];
    col.leads.push(lead);
  }

  return columns;
}
