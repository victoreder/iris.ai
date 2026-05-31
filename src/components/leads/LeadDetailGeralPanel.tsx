import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { formatPhoneBR, getOriginLabel, isMetaOrigin } from "@/lib/leadsAnalytics";
import type { LeadsClique } from "@/types/database";

const statusLabels = {
  convertido: "Convertido",
  expirado: "Expirado",
  aguardando: "Aguardando",
};

interface Props {
  lead: LeadsClique;
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm">{children}</div>
    </div>
  );
}

export function LeadDetailGeralPanel({ lead }: Props) {
  const dispositivo = [lead.device_type, lead.browser, lead.os].filter(Boolean).join(" · ") || "—";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Telefone">
          <p className="text-lg font-semibold">{formatPhoneBR(lead.telefone_lead)}</p>
        </InfoCard>
        <InfoCard label="Status">
          <Badge variant={lead.status === "convertido" ? "success" : "warning"}>
            {statusLabels[lead.status]}
          </Badge>
        </InfoCard>
        <InfoCard label="Campanha">
          <p className="font-medium">{lead.leads_links?.nome ?? "WhatsApp direto"}</p>
        </InfoCard>
        <InfoCard label="Origem">
          <div className="flex items-center gap-2">
            {isMetaOrigin(lead) && <MetaOriginBadge />}
            <span className="font-medium">{getOriginLabel(lead)}</span>
          </div>
        </InfoCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Etapa atual">
          <p className="font-medium">{lead.leads_jornada_etapas?.nome ?? "—"}</p>
        </InfoCard>
        <InfoCard label="Clique no link">
          <p className="font-medium">
            {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
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
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <span>Source: {lead.utm_source ?? "—"}</span>
          <span>Medium: {lead.utm_medium ?? "—"}</span>
          <span>Campaign: {lead.utm_campaign ?? "—"}</span>
          <span>Content: {lead.utm_content ?? "—"}</span>
          <span>Term: {lead.utm_term ?? "—"}</span>
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
    </div>
  );
}
