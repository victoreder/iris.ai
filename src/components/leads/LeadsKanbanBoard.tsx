import { useState } from "react";
import { DollarSign } from "lucide-react";
import { LeadKanbanCard } from "@/components/leads/LeadKanbanCard";
import { columnCrmStats } from "@/lib/leadCrm";
import type { KanbanColumn } from "@/lib/leadsKanban";
import { cn } from "@/lib/utils";
import type { LeadsClique } from "@/types/database";

interface Props {
  columns: KanbanColumn[];
  onLeadClick: (lead: LeadsClique) => void;
  onDragEnd?: (leadId: string, etapaId: string) => void;
  canDrag?: boolean;
}

export function LeadsKanbanBoard({ columns, onLeadClick, onDragEnd, canDrag }: Props) {
  const [dropColId, setDropColId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const totalLeads = columns.reduce((sum, col) => sum + col.leads.length, 0);

  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 scroll-smooth md:snap-none">
      {columns.map((col) => {
        const stats = columnCrmStats(col.leads);
        const share = totalLeads > 0 ? Math.round((col.leads.length / totalLeads) * 100) : 0;
        const isDropTarget = dropColId === col.id;

        return (
          <div
            key={col.id}
            className={cn(
              "flex w-[85vw] shrink-0 snap-center flex-col rounded-xl border border-border bg-muted/40 p-3 sm:w-[280px] md:min-w-[260px] md:snap-align-none",
              isDropTarget && canDrag && "border-primary bg-primary/5"
            )}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              setDropColId(col.id);
            }}
            onDrop={(e) => {
              if (!canDrag || !onDragEnd) return;
              e.preventDefault();
              setDropColId(null);
              setDraggingId(null);
              const leadId = e.dataTransfer.getData("leadId");
              if (leadId && col.id !== "__cliques__") {
                onDragEnd(leadId, col.id);
              }
            }}
          >
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-semibold">{col.title}</h4>
                {col.representa_venda && <DollarSign className="h-4 w-4 shrink-0 text-success" />}
                <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-xs font-medium tabular-nums">
                  {col.leads.length}
                </span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-card">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${share}%` }} />
              </div>
              {(stats.overdue > 0 || stats.reuniaoHoje > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium">
                  {stats.overdue > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-800">
                      {stats.overdue} follow-up atrasado{stats.overdue === 1 ? "" : "s"}
                    </span>
                  )}
                  {stats.reuniaoHoje > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                      {stats.reuniaoHoje} reunião{stats.reuniaoHoje === 1 ? "" : "ões"} hoje
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex max-h-[min(68vh,720px)] min-h-[8rem] flex-col gap-2 overflow-y-auto pr-0.5">
              {col.leads.map((lead) => (
                <div
                  key={lead.id}
                  draggable={canDrag && col.id !== "__cliques__"}
                  className={cn(draggingId === lead.id && "opacity-50")}
                  onDragStart={(e) => {
                    if (!canDrag) return;
                    e.dataTransfer.setData("leadId", lead.id);
                    setDraggingId(lead.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropColId(null);
                  }}
                >
                  <LeadKanbanCard lead={lead} onClick={() => onLeadClick(lead)} />
                </div>
              ))}
              {col.leads.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  {canDrag ? "Arraste um lead para cá" : "Nenhum lead"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
