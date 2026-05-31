import { DollarSign } from "lucide-react";
import { LeadKanbanCard } from "@/components/leads/LeadKanbanCard";
import type { KanbanColumn } from "@/lib/leadsKanban";
import type { LeadsClique } from "@/types/database";

interface Props {
  columns: KanbanColumn[];
  onLeadClick: (lead: LeadsClique) => void;
  onDragEnd?: (leadId: string, etapaId: string) => void;
  canDrag?: boolean;
}

export function LeadsKanbanBoard({ columns, onLeadClick, onDragEnd, canDrag }: Props) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className="min-w-[260px] flex-1 rounded-lg bg-muted/50 p-3"
          onDragOver={(e) => canDrag && e.preventDefault()}
          onDrop={(e) => {
            if (!canDrag || !onDragEnd) return;
            e.preventDefault();
            const leadId = e.dataTransfer.getData("leadId");
            if (leadId && col.id !== "__cliques__") {
              onDragEnd(leadId, col.id);
            }
          }}
        >
          <div className="mb-3 flex items-center gap-2">
            <h4 className="text-sm font-semibold">{col.title}</h4>
            {col.representa_venda && <DollarSign className="h-4 w-4 text-success" />}
            <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium">
              {col.leads.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {col.leads.map((lead) => (
              <div
                key={lead.id}
                draggable={canDrag && col.id !== "__cliques__"}
                onDragStart={(e) => {
                  if (canDrag) e.dataTransfer.setData("leadId", lead.id);
                }}
              >
                <LeadKanbanCard lead={lead} onClick={() => onLeadClick(lead)} />
              </div>
            ))}
            {col.leads.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhum lead</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
