import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogFooter, DialogRoot } from "@/components/ui/dialog";
import {
  DEFAULT_LEADS_TABLE_COLUMNS,
  LEADS_TABLE_COLUMN_GROUPS,
  LEADS_TABLE_COLUMN_LABELS,
  orderLeadsTableColumns,
  saveLeadsTableColumns,
  type LeadsTableColumnKey,
} from "@/lib/leadsTableColumns";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contaId: string;
  columns: LeadsTableColumnKey[];
  onSave: (columns: LeadsTableColumnKey[]) => void;
}

export function LeadsTableColumnPicker({ open, onOpenChange, contaId, columns, onSave }: Props) {
  const [draft, setDraft] = useState<LeadsTableColumnKey[]>(columns);

  useEffect(() => {
    if (open) setDraft(columns);
  }, [open, columns]);

  const toggle = (key: LeadsTableColumnKey) => {
    setDraft((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) {
          toast.error("Selecione ao menos uma coluna.");
          return prev;
        }
        return prev.filter((k) => k !== key);
      }
      return orderLeadsTableColumns([...prev, key]);
    });
  };

  const handleSave = () => {
    if (draft.length === 0) {
      toast.error("Selecione ao menos uma coluna.");
      return;
    }
    const ordered = orderLeadsTableColumns(draft);
    saveLeadsTableColumns(contaId, ordered);
    onSave(ordered);
    toast.success("Visualização salva como padrão.");
    onOpenChange(false);
  };

  const handleRestoreDefault = () => {
    setDraft([...DEFAULT_LEADS_TABLE_COLUMNS]);
  };

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Colunas da tabela"
        description="Escolha quais informações exibir na listagem de leads."
        className="max-w-md"
      >
        <div className="max-h-[min(420px,55vh)] space-y-5 overflow-y-auto pr-1">
          {LEADS_TABLE_COLUMN_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.keys.map((key) => {
                  const checked = draft.includes(key);
                  return (
                    <li key={key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                          checked
                            ? "border-primary/30 bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(key)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span>{LEADS_TABLE_COLUMN_LABELS[key]}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={handleRestoreDefault}>
            Restaurar padrão
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              Salvar visualização
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
