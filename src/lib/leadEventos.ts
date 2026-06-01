import type { LeadsCliqueEvento, LeadsCliqueEventoTipo } from "@/types/database";
import { formatValorVendaBR } from "@/lib/leadValorVenda";

export const LEAD_EVENTO_LABELS: Record<LeadsCliqueEventoTipo, string> = {
  lead_novo: "Novo lead",
  etapa_alterada: "Etapa alterada",
  meta_enviado: "Evento Meta",
  valor_venda_alterado: "Valor da venda",
  origem_adicional: "Nova origem",
};

function detalheValor(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

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
    case "valor_venda_alterado": {
      const anterior = detalheValor(evento.detalhes?.valor_anterior);
      const novo = detalheValor(evento.detalhes?.valor_novo);
      if (novo == null && anterior != null) {
        return "Valor da venda restaurado ao padrão da etapa";
      }
      if (anterior == null && novo != null) {
        return `Valor da venda definido: ${formatValorVendaBR(novo)}`;
      }
      if (anterior != null && novo != null) {
        return `Valor da venda alterado: ${formatValorVendaBR(anterior)} → ${formatValorVendaBR(novo)}`;
      }
      return "Valor da venda atualizado";
    }
    case "origem_adicional": {
      const ordem = evento.detalhes?.ordem;
      const campanha = evento.detalhes?.campanha;
      const ordemLabel =
        ordem === 2 ? "2ª origem" : ordem === 3 ? "3ª origem" : ordem ? `${ordem}ª origem` : "Nova origem";
      return campanha
        ? `${ordemLabel} registrada — campanha "${campanha}"`
        : `${ordemLabel} registrada — novo contato pela mesma campanha ou link`;
    }
    default:
      return "Evento";
  }
}
