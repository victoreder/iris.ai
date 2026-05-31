import { differenceInCalendarDays, format, isSameYear, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadsClique, LeadsCliqueMensagem } from "@/types/database";
import { stripInvisibleChars } from "@/lib/leadsAnalytics";

export type ChatTimelineItem =
  | { type: "date"; key: string; label: string }
  | { type: "message"; key: string; msg: LeadsCliqueMensagem };

export function formatChatDateLabel(date: Date, now = new Date()): string {
  const today = startOfDay(now);
  const day = startOfDay(date);
  const diff = differenceInCalendarDays(today, day);

  if (diff === 0) return "HOJE";
  if (diff === 1) return "ONTEM";

  if (isSameYear(day, today)) {
    return format(day, "d 'de' MMMM", { locale: ptBR }).toUpperCase();
  }

  return format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
}

export function buildChatTimeline(mensagens: LeadsCliqueMensagem[]): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [];
  let lastDateKey = "";

  for (const msg of mensagens) {
    const date = new Date(msg.mensagem_em);
    const dateKey = format(date, "yyyy-MM-dd");
    if (dateKey !== lastDateKey) {
      items.push({
        type: "date",
        key: `date-${dateKey}`,
        label: formatChatDateLabel(date),
      });
      lastDateKey = dateKey;
    }
    items.push({ type: "message", key: msg.id, msg });
  }

  return items;
}

export function buildMensagensExibidas(
  mensagens: LeadsCliqueMensagem[],
  lead: LeadsClique | null
): LeadsCliqueMensagem[] {
  if (mensagens.length > 0) return mensagens;
  if (!lead?.mensagem_recebida?.trim()) return [];

  const legado: LeadsCliqueMensagem = {
    id: "legado-primeira-mensagem",
    conta_id: lead.conta_id,
    clique_id: lead.id,
    instancia_id: lead.instancia_id,
    from_me: false,
    texto: stripInvisibleChars(lead.mensagem_recebida),
    tipo: "texto",
    message_id: null,
    remote_jid: null,
    media_url: null,
    media_mime: null,
    media_nome: null,
    disparou_etapa: false,
    etapa_nome: null,
    etapa_representa_venda: false,
    mensagem_em: lead.convertido_at ?? lead.created_at,
    created_at: lead.convertido_at ?? lead.created_at,
  };

  return [legado];
}
