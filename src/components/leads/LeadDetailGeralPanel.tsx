import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConta } from "@/contexts/ContaContext";
import { LeadCrmSection } from "@/components/leads/LeadCrmSection";
import { LeadDetailOriginsSection } from "@/components/leads/LeadDetailOriginsSection";
import { LeadOriginBadge } from "@/components/leads/MetaOriginBadge";
import {
  buildLeadsListUrlWithUtm,
  LEADS_UTM_LABELS,
  type LeadsUtmField,
} from "@/lib/leadsUtmFilters";
import { contaUrlRef } from "@/lib/appNavigation";
import { formatPhoneBR, getOriginLabel } from "@/lib/leadsAnalytics";
import type { LeadsClique, LeadsCliqueOrigem } from "@/types/database";

interface Props {
  lead: LeadsClique;
  origens: LeadsCliqueOrigem[];
  loadingOrigens?: boolean;
  canWrite?: boolean;
  onCrmSaved?: () => Promise<void> | void;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

function TrackingRow({ label, value }: { label: string; value: string | null }) {
  const display = value?.trim() || "—";

  return (
    <p className="min-w-0 truncate text-muted-foreground" title={value?.trim() || undefined}>
      {label}: <span className="text-foreground">{display}</span>
    </p>
  );
}

function UtmRow({ field, value, contaRef }: { field: LeadsUtmField; value: string | null; contaRef: string }) {
  const label = LEADS_UTM_LABELS[field];

  if (!value?.trim()) {
    return (
      <span className="text-muted-foreground">
        {label}: —
      </span>
    );
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 truncate" title={value}>
        {label}: <span className="font-medium text-foreground">{value}</span>
      </span>
      <Link
        to={buildLeadsListUrlWithUtm(contaRef, field, value)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
        title={`Ver leads com ${label}: ${value}`}
        aria-label={`Ver leads com ${label}: ${value}`}
      >
        <Eye className="h-3.5 w-3.5" />
      </Link>
    </span>
  );
}

export function LeadDetailGeralPanel({
  lead,
  origens,
  loadingOrigens,
  canWrite = false,
  onCrmSaved,
}: Props) {
  const { contaAtiva } = useConta();
  const [rastreioAberto, setRastreioAberto] = useState(false);
  const contaRef = contaAtiva ? contaUrlRef(contaAtiva) : "";
  const dispositivo = [lead.device_type, lead.browser, lead.os].filter(Boolean).join(" · ") || "—";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <LeadCrmSection lead={lead} canWrite={canWrite} onSaved={onCrmSaved} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Telefone">
          <p className="text-lg font-semibold">{formatPhoneBR(lead.telefone_lead)}</p>
        </InfoCard>
        <InfoCard label="Link rastreável">
          <p className="font-medium">{lead.leads_links?.nome ?? "WhatsApp direto"}</p>
        </InfoCard>
        <InfoCard label="Origem">
          <div className="flex items-center gap-2">
            <LeadOriginBadge lead={lead} />
            <span className="font-medium">{getOriginLabel(lead)}</span>
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Etapa atual">
          <p className="font-medium">{lead.leads_jornada_etapas?.nome ?? "—"}</p>
        </InfoCard>
        <InfoCard label="Entrada como lead">
          <p className="font-medium">
            {lead.convertido_at
              ? format(new Date(lead.convertido_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
              : "—"}
          </p>
        </InfoCard>
        <InfoCard label="Dispositivo">
          <p className="font-medium">{dispositivo}</p>
        </InfoCard>
      </div>

      <InfoCard label="UTMs / atribuição">
        <div className="flex flex-col gap-2">
          <UtmRow field="utm_source" value={lead.utm_source} contaRef={contaRef} />
          <UtmRow field="utm_medium" value={lead.utm_medium} contaRef={contaRef} />
          <UtmRow field="utm_campaign" value={lead.utm_campaign} contaRef={contaRef} />
          <UtmRow field="utm_content" value={lead.utm_content} contaRef={contaRef} />
          <UtmRow field="utm_term" value={lead.utm_term} contaRef={contaRef} />
        </div>
      </InfoCard>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rastreio avançado
          </p>
          <button
            type="button"
            onClick={() => setRastreioAberto((aberto) => !aberto)}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={rastreioAberto ? "Recolher" : "Expandir"}
            aria-expanded={rastreioAberto}
            aria-label={rastreioAberto ? "Recolher rastreio avançado" : "Expandir rastreio avançado"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${rastreioAberto ? "rotate-180" : ""}`} />
          </button>
        </div>
        {rastreioAberto && (
          <div className="mt-2 flex min-w-0 flex-col gap-2 text-sm">
            <TrackingRow label="fbclid" value={lead.fbclid} />
            <TrackingRow label="gclid" value={lead.gclid} />
            <TrackingRow label="IP" value={lead.ip_address} />
            <TrackingRow label="fbp" value={lead.fbp} />
            <TrackingRow label="fbc" value={lead.fbc} />
            <TrackingRow label="Referrer" value={lead.referrer} />
            <TrackingRow label="Landing" value={lead.landing_url} />
          </div>
        )}
      </div>

      {!loadingOrigens && <LeadDetailOriginsSection lead={lead} origens={origens} />}
    </div>
  );
}
