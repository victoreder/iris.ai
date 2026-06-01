import type { LeadsClique } from "@/types/database";
import { extractPhoneDigits, normalizeBrazilPhoneNational } from "@/lib/leadsAnalytics";

export function leadPhoneKey(phone: string | null | undefined): string {
  const digits = normalizeBrazilPhoneNational(extractPhoneDigits(phone));
  return digits || "";
}

/** Leads convertidos canônicos: exclui mesclados e deduplica por telefone. */
export function getCanonicalConvertedLeads(cliques: LeadsClique[]): LeadsClique[] {
  const converted = cliques.filter(
    (c) => c.status === "convertido" && !c.clique_principal_id
  );

  const byPhone = new Map<string, LeadsClique>();

  for (const lead of converted) {
    const key = leadPhoneKey(lead.telefone_lead) || lead.id;
    const existing = byPhone.get(key);
    if (!existing) {
      byPhone.set(key, lead);
      continue;
    }

    const existingTs = new Date(existing.convertido_at ?? existing.created_at).getTime();
    const leadTs = new Date(lead.convertido_at ?? lead.created_at).getTime();
    if (leadTs < existingTs) byPhone.set(key, lead);
  }

  return Array.from(byPhone.values());
}
