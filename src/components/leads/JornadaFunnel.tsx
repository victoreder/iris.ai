import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  DollarSign,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { getMetaEventoLabel, shouldSendMetaEvent } from "@/lib/leadsMetaEvents";
import type { LeadsJornadaEtapa } from "@/types/database";

interface JornadaFunnelProps {
  etapas: LeadsJornadaEtapa[];
  canWrite: boolean;
  isAdmin: boolean;
  onCreate: () => void;
  onEdit: (etapa: LeadsJornadaEtapa) => void;
  onDelete: (etapa: LeadsJornadaEtapa) => void;
  onReorder: (ordered: LeadsJornadaEtapa[]) => void;
}

function funnelStepWidth(index: number, total: number): number {
  if (total <= 1) return 100;
  const taper = 14;
  return Math.max(48, 100 - index * taper);
}

export function JornadaFunnel({
  etapas,
  canWrite,
  isAdmin,
  onCreate,
  onEdit,
  onDelete,
  onReorder,
}: JornadaFunnelProps) {
  const sorted = [...etapas].sort((a, b) => a.posicao - b.posicao);
  const [items, setItems] = useState(sorted);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    const next = [...etapas].sort((a, b) => a.posicao - b.posicao);
    setItems(next);
    itemsRef.current = next;
  }, [etapas]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <p className="font-medium">Nenhuma etapa neste funil</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Adicione etapas como proposta, negociação e venda. A etapa de contato inicial é criada
          automaticamente ao conectar o WhatsApp.
        </p>
        {canWrite && (
          <Button className="mt-4" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Criar primeira etapa
          </Button>
        )}
      </div>
    );
  }

  const handleDragStart = (id: string) => {
    if (!canWrite) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    setItems((prev) => {
      const from = prev.findIndex((x) => x.id === draggedId);
      const to = prev.findIndex((x) => x.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  };

  const handleDragEnd = () => {
    if (draggedId && canWrite) {
      onReorder(itemsRef.current);
    }
    setDraggedId(null);
  };

  return (
    <div className="flex flex-col items-center py-4">
      {canWrite && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Arraste as etapas para alterar a ordem do funil
        </p>
      )}

      {items.map((etapa, idx) => {
        const widthPct = funnelStepWidth(idx, items.length);
        const isDragging = draggedId === etapa.id;

        return (
          <div key={etapa.id} className="flex w-full max-w-3xl flex-col items-center">
            {idx > 0 && (
              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <ChevronDown className="h-5 w-5" />
              </div>
            )}

            <div
              className="relative transition-[width] duration-300"
              style={{ width: `${widthPct}%`, minWidth: "min(100%, 20rem)" }}
            >
              <div
                draggable={canWrite}
                onDragStart={() => handleDragStart(etapa.id)}
                onDragOver={(e) => handleDragOver(e, etapa.id)}
                onDragEnd={handleDragEnd}
                className={`overflow-hidden rounded-lg border bg-card shadow-sm transition-opacity ${
                  isDragging ? "border-primary opacity-60" : "border-border"
                } ${canWrite ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                <div className="flex items-start gap-2 px-4 py-3">
                  {canWrite && (
                    <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <span className="font-semibold">{etapa.nome}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {etapa.primeiro_contato && (
                        <Badge variant="primary">Contato inicial</Badge>
                      )}
                      {etapa.representa_venda && (
                        <Badge variant="success">
                          <DollarSign className="mr-1 h-3 w-3" />
                          Venda · R${" "}
                          {Number(etapa.valor_venda).toLocaleString("pt-BR", {
                            minimumFractionDigits: 0,
                          })}
                        </Badge>
                      )}
                      {!etapa.primeiro_contato &&
                        etapa.palavras_chave.map((kw) => (
                          <Badge key={kw} variant="default" className="font-normal">
                            {kw}
                          </Badge>
                        ))}
                      {shouldSendMetaEvent(etapa.evento_meta) ? (
                        <Badge variant="meta" className="gap-1.5">
                          <MetaLogoIcon className="h-4 w-4 shrink-0" />
                          {getMetaEventoLabel(etapa.evento_meta)}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                          Sem evento Meta
                        </Badge>
                      )}
                    </div>
                  </div>

                  {canWrite && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar etapa"
                        onClick={() => onEdit(etapa)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && !etapa.primeiro_contato && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir etapa"
                          onClick={() => onDelete(etapa)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
