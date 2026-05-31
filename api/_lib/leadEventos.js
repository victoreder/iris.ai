async function fetchEtapaNome(supabase, etapaId) {
  if (!etapaId) return null;
  const { data } = await supabase
    .from("leads_jornada_etapas")
    .select("nome")
    .eq("id", etapaId)
    .maybeSingle();
  return data?.nome ?? null;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function logLeadEvento(
  supabase,
  {
    contaId,
    cliqueId,
    tipo,
    etapaId = null,
    etapaNome = null,
    etapaAnteriorId = null,
    etapaAnteriorNome = null,
    eventoMeta = null,
    metaEnviado = null,
    metaErro = null,
    detalhes = null,
  }
) {
  if (!contaId || !cliqueId || !tipo) return;

  try {
    let nomeEtapa = etapaNome;
    let nomeAnterior = etapaAnteriorNome;
    if (etapaId && !nomeEtapa) nomeEtapa = await fetchEtapaNome(supabase, etapaId);
    if (etapaAnteriorId && !nomeAnterior) {
      nomeAnterior = await fetchEtapaNome(supabase, etapaAnteriorId);
    }

    const row = {
      conta_id: contaId,
      clique_id: cliqueId,
      tipo,
      etapa_id: etapaId || null,
      etapa_nome: nomeEtapa || null,
      etapa_anterior_id: etapaAnteriorId || null,
      etapa_anterior_nome: nomeAnterior || null,
      evento_meta: eventoMeta || null,
      meta_enviado: metaEnviado ?? null,
      meta_erro: metaErro || null,
      detalhes: detalhes && typeof detalhes === "object" ? detalhes : null,
    };

    const { error } = await supabase.from("leads_cliques_eventos").insert(row);
    if (error) console.error("logLeadEvento:", error.message);
  } catch (e) {
    console.error("logLeadEvento:", e?.message);
  }
}

export async function recordLeadNovo(supabase, { contaId, cliqueId, etapa, detalhes }) {
  await logLeadEvento(supabase, {
    contaId,
    cliqueId,
    tipo: "lead_novo",
    etapaId: etapa?.id ?? null,
    etapaNome: etapa?.nome ?? null,
    detalhes,
  });
}

export async function recordEtapaAlterada(
  supabase,
  { contaId, cliqueId, etapa, etapaAnteriorId, etapaAnteriorNome, detalhes }
) {
  await logLeadEvento(supabase, {
    contaId,
    cliqueId,
    tipo: "etapa_alterada",
    etapaId: etapa?.id ?? null,
    etapaNome: etapa?.nome ?? null,
    etapaAnteriorId: etapaAnteriorId ?? null,
    etapaAnteriorNome: etapaAnteriorNome ?? null,
    detalhes,
  });
}

export async function recordMetaEnviado(
  supabase,
  { contaId, cliqueId, etapa, eventoMeta, metaEnviado, metaErro, detalhes }
) {
  await logLeadEvento(supabase, {
    contaId,
    cliqueId,
    tipo: "meta_enviado",
    etapaId: etapa?.id ?? null,
    etapaNome: etapa?.nome ?? null,
    eventoMeta,
    metaEnviado,
    metaErro,
    detalhes,
  });
}
