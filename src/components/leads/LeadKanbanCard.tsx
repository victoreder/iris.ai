import { CalendarClock, StickyNote, UserRound } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { LeadOriginBadge } from "@/components/leads/MetaOriginBadge";
import {
  formatCrmDateTime,
  isCrmDateToday,
  isFollowUpOverdue,
  leadResponsavelNome,
} from "@/lib/leadCrm";
import { getOriginLabel, isGoogleOrigin, isMetaOrigin, formatPhoneBR } from "@/lib/leadsAnalytics";
import { cn } from "@/lib/utils";
import type { LeadsClique } from "@/types/database";

interface Props {
  lead: LeadsClique;
  onClick: () => void;
}

export function LeadKanbanCard({ lead, onClick }: Props) {
  const date = lead.convertido_at ?? lead.created_at;
  const origin = getOriginLabel(lead);
  const responsavel = leadResponsavelNome(lead);
  const followUpOverdue = isFollowUpOverdue(lead.data_follow_up);
  const followUpToday = isCrmDateToday(lead.data_follow_up);
  const reuniaoToday = isCrmDateToday(lead.data_reuniao);
  const observacao = lead.observacao?.trim();

  return (
    <Card
      className={cn(
        "cursor-pointer border-border shadow-none transition-shadow hover:shadow-md",
        followUpOverdue && "border-destructive/40"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <p className="text-sm font-medium">{formatPhoneBR(lead.telefone_lead)}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {lead.leads_links?.nome ?? "WhatsApp direto"}
        </p>

        <div className="mt-2 flex flex-col gap-1.5">
          {lead.data_follow_up && (
            <p
              className={cn(
                "flex items-center gap-1 text-[11px]",
                followUpOverdue
                  ? "font-medium text-destructive"
                  : followUpToday
                    ? "font-medium text-warning"
                    : "text-muted-foreground"
              )}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              Follow-up {formatCrmDateTime(lead.data_follow_up)}
              {followUpOverdue ? " · atrasado" : followUpToday ? " · hoje" : ""}
            </p>
          )}
          {lead.data_reuniao && (
            <p
              className={cn(
                "flex items-center gap-1 text-[11px]",
                reuniaoToday ? "font-medium text-warning" : "text-muted-foreground"
              )}
            >
              <CalendarClock className="h-3 w-3 shrink-0" />
              Reunião {formatCrmDateTime(lead.data_reuniao)}
              {reuniaoToday ? " · hoje" : ""}
            </p>
          )}
          {responsavel && (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <UserRound className="h-3 w-3 shrink-0" />
              {responsavel}
            </p>
          )}
          {observacao && (
            <p className="flex items-start gap-1 text-[11px] text-muted-foreground">
              <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{observacao}</span>
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isMetaOrigin(lead) || isGoogleOrigin(lead) ? (
              <LeadOriginBadge lead={lead} />
            ) : (
              <span>{origin}</span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(date), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
