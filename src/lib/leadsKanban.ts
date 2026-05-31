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
  if (lead.status === "aguardando" || lead.status === "expirado") {
    return CLIQUES_COLUMN_ID;
  }
  if (lead.etapa_id) return lead.etapa_id;

  const instId = getLeadInstanciaId(lead);
  const primeiro = etapas.find((e) => e.instancia_id === instId && e.primeiro_contato);
  return primeiro?.id ?? CLIQUES_COLUMN_ID;
}

export function buildKanbanColumns(
  etapas: LeadsJornadaEtapa[],
  instanciaId: string
): Omit<KanbanColumn, "leads">[] {
  const cols: Omit<KanbanColumn, "leads">[] = [
    { id: CLIQUES_COLUMN_ID, title: "Cliques" },
  ];
  const sorted = etapas
    .filter((e) => e.instancia_id === instanciaId)
    .sort((a, b) => a.posicao - b.posicao);

  for (const e of sorted) {
    cols.push({
      id: e.id,
      title: e.nome,
      representa_venda: e.representa_venda,
    });
  }
  return cols;
}

export function groupLeadsByKanbanColumn(
  cliques: LeadsClique[],
  etapas: LeadsJornadaEtapa[],
  instanciaId: string
): KanbanColumn[] {
  const filtered = filterLeadsByInstancia(cliques, instanciaId);
  const columns = buildKanbanColumns(etapas, instanciaId).map((c) => ({
    ...c,
    leads: [] as LeadsClique[],
  }));

  for (const lead of filtered) {
    const colId = resolveKanbanColumnId(lead, etapas);
    const col = columns.find((c) => c.id === colId) ?? columns[0];
    col.leads.push(lead);
  }

  return columns;
}
