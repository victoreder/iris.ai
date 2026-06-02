import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadOrigemBadge } from "@/components/leads/MetaOriginBadge";
import { LEADS_UTM_LABELS, type LeadsUtmField } from "@/lib/leadsUtmFilters";
import {
  origemChannelLabel,
  origemDispositivoLabel,
  origemDisplayOrigin,
  origemOrdemLabel,
} from "@/lib/leadOrigens";
import type { LeadsClique, LeadsCliqueOrigem } from "@/types/database";

interface Props {
  lead: LeadsClique;
  origens: LeadsCliqueOrigem[];
}

function UtmLine({ field, value }: { field: LeadsUtmField; value: string | null }) {
  const label = LEADS_UTM_LABELS[field];
  return (
    <span className="text-muted-foreground">
      {label}: <span className="text-foreground">{value?.trim() || "—"}</span>
    </span>
  );
}

function TrackingLine({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="text-muted-foreground">
      {label}: <span className="text-foreground">{value?.trim() || "—"}</span>
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
          : `${origens.length} entradas por links rastreáveis diferentes.`}
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
              <LeadOrigemBadge origem={origem} />
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm font-medium">{origemDisplayOrigin(origem, lead)}</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Link rastreável: </span>
                <span className="font-medium">{origemChannelLabel(origem, lead)}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Dispositivo: </span>
                <span className="font-medium">{origemDispositivoLabel(origem)}</span>
              </p>
              <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-1 lg:text-right">
                {format(new Date(origem.registrado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <UtmLine field="utm_source" value={origem.utm_source} />
              <UtmLine field="utm_medium" value={origem.utm_medium} />
              <UtmLine field="utm_campaign" value={origem.utm_campaign} />
              <UtmLine field="utm_content" value={origem.utm_content} />
              <UtmLine field="utm_term" value={origem.utm_term} />
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <TrackingLine label="fbclid" value={origem.fbclid} />
              <TrackingLine label="gclid" value={origem.gclid} />
              <TrackingLine label="ttclid" value={origem.ttclid} />
              <TrackingLine label="IP" value={origem.ip_address} />
              <TrackingLine label="fbp" value={origem.fbp} />
              <TrackingLine label="fbc" value={origem.fbc} />
            </div>

            {(origem.referrer || origem.landing_url) && (
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                {origem.referrer && (
                  <p className="truncate">
                    Referrer: <span className="text-foreground">{origem.referrer}</span>
                  </p>
                )}
                {origem.landing_url && (
                  <p className="truncate">
                    Landing: <span className="text-foreground">{origem.landing_url}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
