import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parseOptionalText(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  return text ? text : null;
}

function parseIso(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

async function syncProximoFollowUp(supabase, cliqueId, contaId) {
  const { data } = await supabase
    .from("leads_cliques_follow_ups")
    .select("data_follow_up")
    .eq("clique_id", cliqueId)
    .eq("conta_id", contaId)
    .eq("concluido", false)
    .order("data_follow_up", { ascending: true })
    .limit(1);

  const proximo = data?.[0]?.data_follow_up ?? null;
  const { error } = await supabase
    .from("leads_cliques")
    .update({ data_follow_up: proximo })
    .eq("id", cliqueId)
    .eq("conta_id", contaId);

  if (error) throw error;
  return proximo;
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
    const { acao, cliqueId, followUpId, dataFollowUp, observacao, concluido } = req.body || {};
    const acaoNorm = String(acao ?? "").trim();
    const id = String(cliqueId ?? "").trim();

    if (!id) {
      return res.status(400).json({ error: "cliqueId é obrigatório." });
    }
    if (acaoNorm !== "criar" && acaoNorm !== "concluir") {
      return res.status(400).json({ error: "Ação inválida." });
    }

    const supabase = getSupabase();

    const { data: clique, error: errClique } = await supabase
      .from("leads_cliques")
      .select("id, conta_id")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errClique || !clique) {
      return res.status(404).json({ error: "Lead não encontrado." });
    }

    if (acaoNorm === "criar") {
      const dataParsed = parseIso(dataFollowUp);
      if (!dataParsed) {
        return res.status(400).json({ error: "Data de follow-up obrigatória." });
      }

      const { data: criado, error: errInsert } = await supabase
        .from("leads_cliques_follow_ups")
        .insert({
          conta_id: auth.contaId,
          clique_id: id,
          data_follow_up: dataParsed,
          observacao: parseOptionalText(observacao),
        })
        .select("*")
        .single();

      if (errInsert) {
        return res.status(500).json({ error: errInsert.message });
      }

      const proximo = await syncProximoFollowUp(supabase, id, auth.contaId);
      return res.status(200).json({ success: true, follow_up: criado, data_follow_up: proximo });
    }

    const followId = String(followUpId ?? "").trim();
    if (!followId) {
      return res.status(400).json({ error: "followUpId é obrigatório." });
    }

    const marcado = Boolean(concluido);
    const { data: atualizado, error: errUpdate } = await supabase
      .from("leads_cliques_follow_ups")
      .update({
        concluido: marcado,
        concluido_at: marcado ? new Date().toISOString() : null,
      })
      .eq("id", followId)
      .eq("clique_id", id)
      .eq("conta_id", auth.contaId)
      .select("*")
      .maybeSingle();

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }
    if (!atualizado) {
      return res.status(404).json({ error: "Follow-up não encontrado." });
    }

    const proximo = await syncProximoFollowUp(supabase, id, auth.contaId);
    return res.status(200).json({ success: true, follow_up: atualizado, data_follow_up: proximo });
  } catch (err) {
    console.error("follow-up-lead:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
