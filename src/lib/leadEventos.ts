import type { LeadsCliqueEvento, LeadsCliqueEventoTipo } from "@/types/database";

export const LEAD_EVENTO_LABELS: Record<LeadsCliqueEventoTipo, string> = {
  lead_novo: "Novo lead",
  etapa_alterada: "Etapa alterada",
  meta_enviado: "Evento Meta",
};

export function describeLeadEvento(evento: LeadsCliqueEvento): string {
  switch (evento.tipo) {
    case "lead_novo":
      return evento.etapa_nome
        ? `Novo lead entrou na etapa "${evento.etapa_nome}"`
        : "Novo lead recebido";
    case "etapa_alterada":
      if (evento.etapa_anterior_nome && evento.etapa_nome) {
        return `Etapa alterada: ${evento.etapa_anterior_nome} → ${evento.etapa_nome}`;
      }
      return evento.etapa_nome
        ? `Etapa alterada para "${evento.etapa_nome}"`
        : "Etapa alterada";
    case "meta_enviado":
      if (!evento.evento_meta) return "Tentativa de envio Meta";
      if (evento.meta_enviado) {
        return `Evento Meta enviado: ${evento.evento_meta}`;
      }
      return evento.meta_erro
        ? `Falha ao enviar Meta (${evento.evento_meta}): ${evento.meta_erro}`
        : `Falha ao enviar Meta: ${evento.evento_meta}`;
    default:
      return "Evento";
  }
}
