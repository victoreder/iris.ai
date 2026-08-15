import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

function parseOptionalText(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  return text ? text : null;
}

function parseOptionalIso(raw) {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function parseOptionalUuid(raw) {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
    return undefined;
  }
  return text;
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
    const { cliqueId, observacao, dataReuniao, responsavelId } = req.body || {};
    const id = String(cliqueId ?? "").trim();
    if (!id) {
      return res.status(400).json({ error: "cliqueId é obrigatório." });
    }

    const observacaoParsed = parseOptionalText(observacao);
    const reuniaoParsed = parseOptionalIso(dataReuniao);
    const responsavelParsed = parseOptionalUuid(responsavelId);

    if (reuniaoParsed === undefined) {
      return res.status(400).json({ error: "Data de reunião inválida." });
    }
    if (responsavelParsed === undefined) {
      return res.status(400).json({ error: "Responsável inválido." });
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

    if (responsavelParsed) {
      const { data: membro, error: errMembro } = await supabase
        .from("conta_membros")
        .select("user_id")
        .eq("conta_id", auth.contaId)
        .eq("user_id", responsavelParsed)
        .maybeSingle();

      if (errMembro || !membro) {
        return res.status(400).json({ error: "Responsável não pertence a esta conta." });
      }
    }

    const { error: errUpdate } = await supabase
      .from("leads_cliques")
      .update({
        observacao: observacaoParsed,
        data_reuniao: reuniaoParsed,
        responsavel_id: responsavelParsed,
      })
      .eq("id", id)
      .eq("conta_id", auth.contaId);

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    return res.status(200).json({
      success: true,
      observacao: observacaoParsed,
      data_reuniao: reuniaoParsed,
      responsavel_id: responsavelParsed,
    });
  } catch (err) {
    console.error("atualizar-crm-lead:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
