import type { LeadsClique, LeadsCliqueOrigem } from "@/types/database";
import { getOriginLabel } from "@/lib/leadsAnalytics";
import { supabase } from "@/lib/supabase";

export function origemOrdemLabel(ordem: number): string {
  if (ordem === 1) return "1ª origem";
  if (ordem === 2) return "2ª origem";
  if (ordem === 3) return "3ª origem";
  return `${ordem}ª origem`;
}

export function origemFromLead(lead: LeadsClique): LeadsCliqueOrigem {
  return {
    id: `synthetic-${lead.id}`,
    conta_id: lead.conta_id,
    clique_id: lead.id,
    ordem: 1,
    origem_clique_id: lead.id,
    link_id: lead.link_id,
    campanha_nome: lead.leads_links?.nome ?? (lead.link_id ? null : "WhatsApp direto"),
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
    fbclid: lead.fbclid,
    gclid: lead.gclid,
    ttclid: lead.ttclid,
    referrer: lead.referrer,
    landing_url: lead.landing_url,
    fbp: lead.fbp,
    fbc: lead.fbc,
    registrado_em: lead.convertido_at ?? lead.created_at,
  };
}

export function origemChannelLabel(origem: LeadsCliqueOrigem, leadFallback?: LeadsClique): string {
  if (origem.campanha_nome) return origem.campanha_nome;
  if (leadFallback?.leads_links?.nome) return leadFallback.leads_links.nome;
  return "WhatsApp direto";
}

export function origemIsMeta(origem: LeadsCliqueOrigem): boolean {
  return Boolean(
    origem.fbp ||
      origem.fbc ||
      origem.fbclid ||
      origem.utm_campaign ||
      origem.utm_medium?.match(/facebook|meta|fb|instagram|ig/i)
  );
}

export function origemDisplayOrigin(origem: LeadsCliqueOrigem, leadFallback?: LeadsClique): string {
  if (leadFallback && origem.ordem === 1 && origem.id.startsWith("synthetic-")) {
    return getOriginLabel(leadFallback);
  }
  if (origemIsMeta(origem)) return "Meta Ads";
  if (origem.gclid) return "Google Ads";
  if (
    origem.utm_source ||
    origem.utm_medium ||
    origem.utm_campaign ||
    origem.utm_content ||
    origem.utm_term
  ) {
    return "Outras origens";
  }
  return "Sem rastreio";
}

export async function fetchLeadOrigens(cliqueId: string): Promise<LeadsCliqueOrigem[]> {
  const { data, error } = await supabase
    .from("leads_cliques_origens")
    .select("*")
    .eq("clique_id", cliqueId)
    .order("ordem", { ascending: true });

  if (error) return [];
  return (data as LeadsCliqueOrigem[]) ?? [];
}

export async function resolveLeadOrigens(lead: LeadsClique): Promise<LeadsCliqueOrigem[]> {
  const rows = await fetchLeadOrigens(lead.id);
  if (rows.length > 0) return rows;
  return [origemFromLead(lead)];
}
