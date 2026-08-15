import { format, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadsClique } from "@/types/database";

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
