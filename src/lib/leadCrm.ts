import { addDays, endOfDay, format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { LEAD_DETAIL_SELECT } from "@/lib/leadsConstants";
import type { LeadsClique } from "@/types/database";
import type { Usuario } from "@/types/usuario";

export type LeadCrmPayload = {
  observacao: string | null;
  dataFollowUp: string | null;
  dataReuniao: string | null;
  responsavelId: string | null;
};

export interface LeadCrmMetrics {
  total: number;
  followUpAtrasado: number;
  followUpHoje: number;
  reuniaoHoje: number;
  semResponsavel: number;
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isCrmDateToday(iso: string | null | undefined, now = new Date()): boolean {
  const date = parseDate(iso);
  if (!date) return false;
  return startOfDay(date).getTime() === startOfDay(now).getTime();
}

export function isFollowUpOverdue(iso: string | null | undefined, now = new Date()): boolean {
  const date = parseDate(iso);
  if (!date) return false;
  return isBefore(startOfDay(date), startOfDay(now));
}

export function formatCrmDateTime(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return "—";
  return format(date, "dd/MM HH:mm", { locale: ptBR });
}

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  const date = parseDate(iso);
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function leadResponsavelNome(lead: LeadsClique): string | null {
  const nome = lead.responsavel?.nome?.trim();
  if (nome) return nome;
  const email = lead.responsavel?.email?.trim();
  return email || null;
}

export function columnCrmStats(leads: LeadsClique[]) {
  return {
    overdue: leads.filter((lead) => isFollowUpOverdue(lead.data_follow_up)).length,
    reuniaoHoje: leads.filter((lead) => isCrmDateToday(lead.data_reuniao)).length,
  };
}

export function aggregateLeadCrmMetrics(leads: LeadsClique[]): LeadCrmMetrics {
  return {
    total: leads.length,
    followUpAtrasado: leads.filter((lead) => isFollowUpOverdue(lead.data_follow_up)).length,
    followUpHoje: leads.filter((lead) => isCrmDateToday(lead.data_follow_up)).length,
    reuniaoHoje: leads.filter((lead) => isCrmDateToday(lead.data_reuniao)).length,
    semResponsavel: leads.filter((lead) => !lead.responsavel_id).length,
  };
}

export type LeadResponsavel = Pick<Usuario, "id" | "nome" | "email" | "foto_url">;

export async function loadContaResponsaveis(contaId: string): Promise<Map<string, LeadResponsavel>> {
  const { data } = await supabase
    .from("conta_membros")
    .select("user_id, usuarios(id, nome, email, foto_url)")
    .eq("conta_id", contaId);

  const map = new Map<string, LeadResponsavel>();
  for (const row of data ?? []) {
    const raw = (row as { user_id: string; usuarios: LeadResponsavel | LeadResponsavel[] | null }).usuarios;
    const user = Array.isArray(raw) ? raw[0] : raw;
    if (user?.id) map.set(user.id, user);
  }
  return map;
}

export function attachLeadResponsaveis(
  leads: LeadsClique[],
  byId: Map<string, LeadResponsavel>
): LeadsClique[] {
  return leads.map((lead) => ({
    ...lead,
    responsavel: lead.responsavel_id ? (byId.get(lead.responsavel_id) ?? lead.responsavel ?? null) : null,
  }));
}

export function attachLeadResponsavel(
  lead: LeadsClique,
  byId: Map<string, LeadResponsavel>
): LeadsClique {
  return attachLeadResponsaveis([lead], byId)[0];
}

export type CrmAgendaKind = "follow_up" | "reuniao";
export type CrmAgendaBucket = "atrasado" | "hoje" | "proximos";

export interface CrmAgendaItem {
  id: string;
  kind: CrmAgendaKind;
  at: string;
  observacao: string | null;
  followUpId?: string;
  lead: LeadsClique;
}

export interface CrmAgendaGroup {
  key: CrmAgendaBucket;
  title: string;
  items: CrmAgendaItem[];
}

export async function loadCrmAgenda(contaId: string, horizonDays = 7): Promise<CrmAgendaItem[]> {
  const until = endOfDay(addDays(new Date(), horizonDays)).toISOString();
  const todayStart = startOfDay(new Date()).toISOString();

  const [followRes, reuniaoRes, responsaveis] = await Promise.all([
    supabase
      .from("leads_cliques_follow_ups")
      .select(`id, data_follow_up, observacao, clique_id, leads_cliques(${LEAD_DETAIL_SELECT})`)
      .eq("conta_id", contaId)
      .eq("concluido", false)
      .lte("data_follow_up", until)
      .order("data_follow_up", { ascending: true })
      .limit(200),
    supabase
      .from("leads_cliques")
      .select(LEAD_DETAIL_SELECT)
      .eq("conta_id", contaId)
      .not("data_reuniao", "is", null)
      .gte("data_reuniao", todayStart)
      .lte("data_reuniao", until)
      .order("data_reuniao", { ascending: true })
      .limit(200),
    loadContaResponsaveis(contaId),
  ]);

  const items: CrmAgendaItem[] = [];

  for (const row of followRes.data ?? []) {
    const raw = row as {
      id: string;
      data_follow_up: string;
      observacao: string | null;
      leads_cliques: LeadsClique | LeadsClique[] | null;
    };
    const leadRaw = Array.isArray(raw.leads_cliques) ? raw.leads_cliques[0] : raw.leads_cliques;
    if (!leadRaw) continue;
    items.push({
      id: `follow-${raw.id}`,
      kind: "follow_up",
      at: raw.data_follow_up,
      observacao: raw.observacao,
      followUpId: raw.id,
      lead: attachLeadResponsavel(leadRaw, responsaveis),
    });
  }

  for (const leadRaw of (reuniaoRes.data as LeadsClique[]) ?? []) {
    if (!leadRaw.data_reuniao) continue;
    items.push({
      id: `reuniao-${leadRaw.id}`,
      kind: "reuniao",
      at: leadRaw.data_reuniao,
      observacao: leadRaw.observacao,
      lead: attachLeadResponsavel(leadRaw, responsaveis),
    });
  }

  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function groupCrmAgenda(items: CrmAgendaItem[], now = new Date()): CrmAgendaGroup[] {
  const today = startOfDay(now).getTime();
  const atrasado: CrmAgendaItem[] = [];
  const hoje: CrmAgendaItem[] = [];
  const proximos: CrmAgendaItem[] = [];

  for (const item of items) {
    const day = startOfDay(new Date(item.at)).getTime();
    if (day < today) atrasado.push(item);
    else if (day === today) hoje.push(item);
    else proximos.push(item);
  }

  return [
    { key: "atrasado", title: "Atrasados", items: atrasado },
    { key: "hoje", title: "Hoje", items: hoje },
    { key: "proximos", title: "Próximos 7 dias", items: proximos },
  ];
}
