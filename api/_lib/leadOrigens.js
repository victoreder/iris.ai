import { phonesMatch } from "./leadsUtils.js";
import { logLeadEvento } from "./leadEventos.js";

const CLIQUE_SELECT =
  "*, leads_links(id, slug, nome, mensagem_inicial, instancia_id)";

function origemSnapshotFromClique(clique) {
  const link = clique.leads_links ?? null;
  return {
    origem_clique_id: clique.id,
    link_id: clique.link_id ?? null,
    campanha_nome: link?.nome ?? (clique.link_id ? null : "WhatsApp direto"),
    utm_source: clique.utm_source ?? null,
    utm_medium: clique.utm_medium ?? null,
    utm_campaign: clique.utm_campaign ?? null,
    utm_content: clique.utm_content ?? null,
    utm_term: clique.utm_term ?? null,
    fbclid: clique.fbclid ?? null,
    gclid: clique.gclid ?? null,
    ttclid: clique.ttclid ?? null,
    referrer: clique.referrer ?? null,
    landing_url: clique.landing_url ?? null,
    fbp: clique.fbp ?? null,
    fbc: clique.fbc ?? null,
  };
}

export async function fetchCliqueWithLinks(supabase, cliqueId) {
  const { data, error } = await supabase
    .from("leads_cliques")
    .select(CLIQUE_SELECT)
    .eq("id", cliqueId)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * Lead convertido principal pelo telefone (conta inteira).
 */
export async function findPrincipalLeadByPhone(supabase, { contaId, telefone, excludeCliqueId }) {
  if (!contaId || !telefone?.trim()) return null;

  const { data: candidatos, error } = await supabase
    .from("leads_cliques")
    .select(CLIQUE_SELECT)
    .eq("conta_id", contaId)
    .eq("status", "convertido")
    .is("clique_principal_id", null)
    .not("telefone_lead", "is", null)
    .order("convertido_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("findPrincipalLeadByPhone:", error.message);
    return null;
  }

  for (const c of candidatos ?? []) {
    if (excludeCliqueId && c.id === excludeCliqueId) continue;
    if (phonesMatch(telefone, c.telefone_lead)) return c;
  }

  return null;
}

async function getNextOrigemOrdem(supabase, cliqueId) {
  const { data } = await supabase
    .from("leads_cliques_origens")
    .select("ordem")
    .eq("clique_id", cliqueId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.ordem ?? 0) + 1;
}

export async function recordLeadOrigem(supabase, { contaId, cliqueId, sourceClique, ordem }) {
  if (!contaId || !cliqueId || !sourceClique) return null;

  const snapshot = origemSnapshotFromClique(sourceClique);
  const finalOrdem = ordem ?? (await getNextOrigemOrdem(supabase, cliqueId));

  const { data: existing } = await supabase
    .from("leads_cliques_origens")
    .select("id")
    .eq("clique_id", cliqueId)
    .eq("origem_clique_id", snapshot.origem_clique_id)
    .maybeSingle();

  if (existing) return existing;

  const row = {
    conta_id: contaId,
    clique_id: cliqueId,
    ordem: finalOrdem,
    ...snapshot,
  };

  const { data, error } = await supabase
    .from("leads_cliques_origens")
    .insert(row)
    .select("id, ordem")
    .maybeSingle();

  if (error) {
    console.error("recordLeadOrigem:", error.message);
    return null;
  }

  return data;
}

export async function mergeAguardandoIntoPrincipal(supabase, { secondaryId, principalId, telefone }) {
  if (!secondaryId || !principalId || secondaryId === principalId) return;

  await supabase
    .from("leads_cliques")
    .update({
      status: "expirado",
      clique_principal_id: principalId,
      telefone_lead: telefone || null,
    })
    .eq("id", secondaryId)
    .eq("status", "aguardando");
}

export async function recordOrigemAdicionalEvento(supabase, { contaId, cliqueId, ordem, campanhaNome, detalhes }) {
  await logLeadEvento(supabase, {
    contaId,
    cliqueId,
    tipo: "origem_adicional",
    detalhes: {
      ordem,
      campanha: campanhaNome ?? null,
      ...(detalhes && typeof detalhes === "object" ? detalhes : {}),
    },
  });
}

/**
 * Se o telefone já pertence a um lead convertido, mescla o clique aguardando e retorna o principal.
 */
export async function resolveEffectiveLead(supabase, { clique, trackingId, telefone }) {
  if (!clique || !trackingId || !telefone?.trim()) {
    return { clique, trackingId, merged: false, principalId: trackingId };
  }

  if (clique.status !== "aguardando" || clique.clique_principal_id) {
    return { clique, trackingId, merged: false, principalId: trackingId };
  }

  const principal = await findPrincipalLeadByPhone(supabase, {
    contaId: clique.conta_id,
    telefone,
    excludeCliqueId: trackingId,
  });

  if (!principal || principal.id === trackingId) {
    return { clique, trackingId, merged: false, principalId: trackingId };
  }

  const ordem = await getNextOrigemOrdem(supabase, principal.id);
  await recordLeadOrigem(supabase, {
    contaId: clique.conta_id,
    cliqueId: principal.id,
    sourceClique: clique,
    ordem,
  });

  await mergeAguardandoIntoPrincipal(supabase, {
    secondaryId: trackingId,
    principalId: principal.id,
    telefone,
  });

  await recordOrigemAdicionalEvento(supabase, {
    contaId: clique.conta_id,
    cliqueId: principal.id,
    ordem,
    campanhaNome: clique.leads_links?.nome ?? null,
    detalhes: {
      origem_clique_id: trackingId,
      matchMethod: "telefone_duplicado",
    },
  });

  const refreshed = await fetchCliqueWithLinks(supabase, principal.id);

  return {
    clique: refreshed ?? principal,
    trackingId: principal.id,
    merged: true,
    principalId: principal.id,
    origemOrdem: ordem,
  };
}

export async function ensureFirstOrigem(supabase, { clique }) {
  if (!clique?.conta_id || !clique?.id) return;

  const { data: existing } = await supabase
    .from("leads_cliques_origens")
    .select("id")
    .eq("clique_id", clique.id)
    .eq("ordem", 1)
    .maybeSingle();

  if (existing) return;

  await recordLeadOrigem(supabase, {
    contaId: clique.conta_id,
    cliqueId: clique.id,
    sourceClique: clique,
    ordem: 1,
  });
}
