import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { LEADS_UTM_LABELS, type LeadsUtmField } from "@/lib/leadsUtmFilters";
import {
  origemChannelLabel,
  origemDisplayOrigin,
  origemIsMeta,
  origemOrdemLabel,
} from "@/lib/leadOrigens";
import type { LeadsClique, LeadsCliqueOrigem } from "@/types/database";

interface Props {
  lead: LeadsClique;
  origens: LeadsCliqueOrigem[];
}

function UtmLine({ field, value }: { field: LeadsUtmField; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <span className="text-muted-foreground">
      {LEADS_UTM_LABELS[field]}: <span className="text-foreground">{value}</span>
    </span>
  );
}

export function LeadDetailOriginsSection({ lead, origens }: Props) {
  if (origens.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Origens do lead
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {origens.length === 1
          ? "Entrada única registrada para este telefone."
          : `${origens.length} entradas por campanhas diferentes.`}
      </p>

      <div className="mt-4 space-y-4">
        {origens.map((origem) => (
          <div
            key={origem.id}
            className="rounded-lg border border-border/80 bg-muted/20 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {origemOrdemLabel(origem.ordem)}
              </span>
              {origemIsMeta(origem) && <MetaOriginBadge />}
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-medium">{origemDisplayOrigin(origem, lead)}</span>
            </div>

            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">Campanha: </span>
              <span className="font-medium">{origemChannelLabel(origem, lead)}</span>
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {format(new Date(origem.registrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <UtmLine field="utm_source" value={origem.utm_source} />
              <UtmLine field="utm_medium" value={origem.utm_medium} />
              <UtmLine field="utm_campaign" value={origem.utm_campaign} />
              <UtmLine field="utm_content" value={origem.utm_content} />
              <UtmLine field="utm_term" value={origem.utm_term} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
