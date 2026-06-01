import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { recordValorVendaAlterado } from "../_lib/leadEventos.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parseValorInput(raw) {
  if (raw == null || raw === "") return null;
  const num = Number(raw);
  if (Number.isNaN(num) || num < 0) return undefined;
  return num;
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "membro" });
  if (!auth) return;

  try {
    const { cliqueId, valorVenda } = req.body || {};
    const id = String(cliqueId ?? "").trim();
    if (!id) {
      return res.status(400).json({ error: "cliqueId é obrigatório." });
    }

    const parsed =
      valorVenda === null || valorVenda === undefined || valorVenda === ""
        ? null
        : parseValorInput(valorVenda);

    if (parsed === undefined) {
      return res.status(400).json({ error: "Valor de venda inválido." });
    }

    const supabase = getSupabase();

    const { data: clique, error: errClique } = await supabase
      .from("leads_cliques")
      .select("id, conta_id, valor_venda, etapa_id, leads_jornada_etapas(representa_venda)")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errClique || !clique) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    if (!clique.leads_jornada_etapas?.representa_venda) {
      return res.status(400).json({ error: "O lead não está em uma etapa de venda." });
    }

    const valorAnterior = clique.valor_venda != null ? Number(clique.valor_venda) : null;
    const valorNovo = parsed;

    if (valorAnterior === valorNovo) {
      return res.status(200).json({ success: true, unchanged: true });
    }

    const { error: errUpdate } = await supabase
      .from("leads_cliques")
      .update({ valor_venda: valorNovo })
      .eq("id", id)
      .eq("conta_id", auth.contaId);

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    await recordValorVendaAlterado(supabase, {
      contaId: auth.contaId,
      cliqueId: id,
      valorAnterior,
      valorNovo,
      detalhes: { origem: "manual" },
    });

    return res.status(200).json({ success: true, valor_venda: valorNovo });
  } catch (err) {
    console.error("atualizar-valor-venda-lead:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
