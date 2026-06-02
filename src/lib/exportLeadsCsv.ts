import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneBR, getOriginLabel } from "@/lib/leadsAnalytics";
import type { LeadsClique } from "@/types/database";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportLeadsCsv(leads: LeadsClique[], filename = "leads.csv") {
  const headers = ["Telefone", "Etapa", "Link rastreável", "Origem", "Entrada"];
  const rows = leads.map((c) => [
    formatPhoneBR(c.telefone_lead),
    c.leads_jornada_etapas?.nome ?? "",
    c.leads_links?.nome ?? "WhatsApp direto",
    getOriginLabel(c),
    format(new Date(c.convertido_at ?? c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
  ]);

  const csv = [headers, ...rows].map((row) => row.map((c) => escapeCsv(c)).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
