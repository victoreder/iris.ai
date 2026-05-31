import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { sendMetaForEtapa } from "../_lib/metaConversions.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "membro" });
  if (!auth) return;

  try {
    const { cliqueId, etapaId } = req.body || {};
    const id = String(cliqueId ?? "").trim();
    const etapa = String(etapaId ?? "").trim();

    if (!id || !etapa) {
      return res.status(400).json({ error: "cliqueId e etapaId são obrigatórios." });
    }

    const supabase = getSupabase();

    const { data: clique, error: errClique } = await supabase
      .from("leads_cliques")
      .select("*, leads_links(id, slug, nome, instancia_id)")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errClique || !clique) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    const { data: etapaRow, error: errEtapa } = await supabase
      .from("leads_jornada_etapas")
      .select("*")
      .eq("id", etapa)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errEtapa || !etapaRow) {
      return res.status(404).json({ error: "Etapa não encontrada." });
    }

    const instanciaId = clique.instancia_id ?? clique.leads_links?.instancia_id;
    if (!instanciaId || etapaRow.instancia_id !== instanciaId) {
      return res.status(400).json({ error: "Etapa não pertence ao WhatsApp deste lead." });
    }

    const now = new Date().toISOString();
    const { error: errUpdate } = await supabase
      .from("leads_cliques")
      .update({
        etapa_id: etapaRow.id,
        etapa_atualizada_at: now,
      })
      .eq("id", id);

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    const cliqueAtualizado = {
      ...clique,
      etapa_id: etapaRow.id,
      etapa_atualizada_at: now,
    };

    const metaResult = await sendMetaForEtapa({
      supabase,
      clique: cliqueAtualizado,
      link: clique.leads_links,
      etapa: etapaRow,
      force: true,
    });

    return res.status(200).json({
      success: true,
      etapa: { id: etapaRow.id, nome: etapaRow.nome },
      meta: metaResult,
    });
  } catch (err) {
    console.error("atualizar-etapa-lead:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
