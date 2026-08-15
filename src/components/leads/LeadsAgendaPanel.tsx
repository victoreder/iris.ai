import { CalendarClock, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import {
  formatCrmDateTime,
  groupCrmAgenda,
  leadResponsavelNome,
  type CrmAgendaItem,
} from "@/lib/leadCrm";
import { formatPhoneBR } from "@/lib/leadsAnalytics";
import { cn } from "@/lib/utils";
import type { LeadsClique } from "@/types/database";

interface Props {
  items: CrmAgendaItem[];
  canWrite: boolean;
  onOpenLead: (lead: LeadsClique) => void;
  onFollowUpDone: () => void;
}

export function LeadsAgendaPanel({ items, canWrite, onOpenLead, onFollowUpDone }: Props) {
  const { contaAtiva } = useConta();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const groups = groupCrmAgenda(items);
  const total = items.length;

  const handleToggle = async (item: CrmAgendaItem) => {
    if (!contaAtiva || !canWrite || !item.followUpId) return;
    setTogglingId(item.id);
    try {
      await apiPost(
        "/api/leads/follow-up-lead",
        {
          acao: "concluir",
          cliqueId: item.lead.id,
          followUpId: item.followUpId,
          concluido: true,
        },
        contaAtiva.id
      );
      onFollowUpDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao concluir follow-up.");
    } finally {
      setTogglingId(null);
    }
  };

  if (total === 0) {
    return (
      <Card className="px-4 py-12 text-center">
        <p className="font-medium">Nenhuma ação nos próximos dias</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Follow-ups atrasados e reuniões da semana aparecem aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                {group.items.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => {
                const responsavel = leadResponsavelNome(item.lead);
                return (
                  <Card
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 px-3 py-3 shadow-none transition-colors hover:bg-muted/40"
                    onClick={() => onOpenLead(item.lead)}
                  >
                    {item.kind === "follow_up" && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={false}
                        aria-label="Concluir follow-up"
                        disabled={!canWrite || togglingId === item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleToggle(item);
                        }}
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border bg-card hover:border-primary",
                          (!canWrite || togglingId === item.id) && "opacity-60"
                        )}
                      >
                        {togglingId === item.id && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    )}
                    {item.kind === "reuniao" && (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-warning">
                        <CalendarClock className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.kind === "follow_up" ? "warning" : "primary"} className="font-normal">
                          {item.kind === "follow_up" ? "Follow-up" : "Reunião"}
                        </Badge>
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            group.key === "atrasado" && "text-destructive"
                          )}
                        >
                          {formatCrmDateTime(item.at)}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatPhoneBR(item.lead.telefone_lead)}
                      </p>
                      {item.observacao?.trim() && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.observacao}</p>
                      )}
                      {responsavel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{responsavel}</p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )
      )}
    </div>
  );
}
