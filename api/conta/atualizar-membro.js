import { getSupabase } from "../_lib.js";
import { requireContaAuth, logSystemEvent } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

const PAPEIS = new Set(["admin", "membro", "visualizador"]);

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const { membroId, nome, papel } = req.body || {};
    const id = String(membroId ?? "").trim();
    const nomeTrim = nome !== undefined ? String(nome).trim() : undefined;
    const papelNorm = papel !== undefined ? String(papel).trim() : undefined;

    if (!id) {
      return res.status(400).json({ error: "Membro é obrigatório." });
    }
    if (papelNorm !== undefined && !PAPEIS.has(papelNorm)) {
      return res.status(400).json({ error: "Papel inválido." });
    }

    const supabase = getSupabase();

    const { data: membro, error: errMembro } = await supabase
      .from("conta_membros")
      .select("id, conta_id, user_id, papel")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errMembro || !membro) {
      return res.status(404).json({ error: "Membro não encontrado nesta conta." });
    }

    if (papelNorm && papelNorm !== membro.papel && membro.papel === "admin") {
      const { count } = await supabase
        .from("conta_membros")
        .select("id", { count: "exact", head: true })
        .eq("conta_id", auth.contaId)
        .eq("papel", "admin");

      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: "A conta precisa de pelo menos um admin." });
      }
    }

    if (papelNorm && papelNorm !== membro.papel) {
      const { error: errPapel } = await supabase
        .from("conta_membros")
        .update({ papel: papelNorm })
        .eq("id", membro.id);

      if (errPapel) throw errPapel;
    }

    if (nomeTrim !== undefined) {
      const { error: errNome } = await supabase
        .from("usuarios")
        .update({ nome: nomeTrim || null })
        .eq("id", membro.user_id);

      if (errNome) throw errNome;
    }

    await logSystemEvent(supabase, {
      tipo: "membro_atualizado",
      nivel: "info",
      mensagem: "Membro da equipe atualizado",
      detalhes: { membroId: id, userId: membro.user_id, papel: papelNorm, nome: nomeTrim },
      usuarioId: auth.userId,
      contaId: auth.contaId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("atualizar-membro:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
