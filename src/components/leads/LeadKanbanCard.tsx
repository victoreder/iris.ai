import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { LeadOriginBadge } from "@/components/leads/MetaOriginBadge";
import { getOriginLabel, isGoogleOrigin, isMetaOrigin, formatPhoneBR } from "@/lib/leadsAnalytics";
import type { LeadsClique } from "@/types/database";

interface Props {
  lead: LeadsClique;
  onClick: () => void;
}

export function LeadKanbanCard({ lead, onClick }: Props) {
  const date = lead.convertido_at ?? lead.created_at;
  const origin = getOriginLabel(lead);

  return (
    <Card
      className="cursor-pointer border-border shadow-none transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <p className="text-sm font-medium">{formatPhoneBR(lead.telefone_lead)}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {lead.leads_links?.nome ?? "WhatsApp direto"}
        </p>
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
