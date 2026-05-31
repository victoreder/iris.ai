import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { LeadsInstanciaWhatsapp } from "@/types/database";

interface WhatsappTabsProps {
  instancias: LeadsInstanciaWhatsapp[];
  value: string;
  onChange: (id: string) => void;
  etapaCounts?: Record<string, number>;
  somenteEtapaPadrao?: Record<string, boolean>;
  className?: string;
}

export function WhatsappTabs({
  instancias,
  value,
  onChange,
  etapaCounts,
  somenteEtapaPadrao,
  className,
}: WhatsappTabsProps) {
  if (instancias.length <= 1) return null;

  return (
    <div
      className={cn("flex min-w-0 flex-1 gap-1 overflow-x-auto", className)}
      role="tablist"
      aria-label="WhatsApps"
    >
      {instancias.map((instancia) => {
        const active = instancia.id === value;
        const count = etapaCounts?.[instancia.id] ?? 0;
        const pendenteConfig = somenteEtapaPadrao?.[instancia.id] ?? false;

        return (
          <button
            key={instancia.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(instancia.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2.5 text-left transition-colors",
              active
                ? "border-border bg-background text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {pendenteConfig && (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                title="Funil ainda não configurado"
              />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{instancia.nome}</span>
              {instancia.telefone && (
                <span className="block truncate text-xs text-muted-foreground">
                  {instancia.telefone}
                </span>
              )}
            </span>
            <Badge variant={count > 0 ? "default" : "warning"} className="shrink-0 tabular-nums">
              {count === 0 ? "Vazio" : count === 1 ? "1 etapa" : `${count} etapas`}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
