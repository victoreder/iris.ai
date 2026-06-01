import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConta } from "@/contexts/ContaContext";
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
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
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
      <span className="min-w-0 truncate">
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

export function LeadDetailGeralPanel({ lead, origens, loadingOrigens }: Props) {
  const { contaAtiva } = useConta();
  const contaRef = contaAtiva ? contaUrlRef(contaAtiva) : "";
  const dispositivo = [lead.device_type, lead.browser, lead.os].filter(Boolean).join(" · ") || "—";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Telefone">
          <p className="text-lg font-semibold">{formatPhoneBR(lead.telefone_lead)}</p>
        </InfoCard>
        <InfoCard label="Campanha">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <UtmRow field="utm_source" value={lead.utm_source} contaRef={contaRef} />
          <UtmRow field="utm_medium" value={lead.utm_medium} contaRef={contaRef} />
          <UtmRow field="utm_campaign" value={lead.utm_campaign} contaRef={contaRef} />
          <UtmRow field="utm_content" value={lead.utm_content} contaRef={contaRef} />
          <UtmRow field="utm_term" value={lead.utm_term} contaRef={contaRef} />
        </div>
      </InfoCard>

      <InfoCard label="Rastreio avançado">
        <div className="grid gap-2 text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          <span>fbclid: {lead.fbclid ?? "—"}</span>
          <span>gclid: {lead.gclid ?? "—"}</span>
          <span>IP: {lead.ip_address ?? "—"}</span>
          <span>fbp: {lead.fbp ?? "—"}</span>
          <span>fbc: {lead.fbc ?? "—"}</span>
        </div>
        {lead.referrer && <p className="mt-3 truncate text-muted-foreground">Referrer: {lead.referrer}</p>}
        {lead.landing_url && (
          <p className="mt-1 truncate text-muted-foreground">Landing: {lead.landing_url}</p>
        )}
      </InfoCard>

      {!loadingOrigens && <LeadDetailOriginsSection lead={lead} origens={origens} />}
    </div>
  );
}
