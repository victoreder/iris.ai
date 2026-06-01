import { getSupabase } from "../_lib.js";
import { requireContaAuth, logSystemEvent } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const { membroId } = req.body || {};
    const id = String(membroId ?? "").trim();

    if (!id) {
      return res.status(400).json({ error: "Membro é obrigatório." });
    }

    const supabase = getSupabase();

    const { data: membro, error: errMembro } = await supabase
      .from("conta_membros")
      .select("id, conta_id, user_id, papel, usuarios(email)")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errMembro || !membro) {
      return res.status(404).json({ error: "Membro não encontrado nesta conta." });
    }

    if (membro.user_id === auth.userId) {
      return res.status(400).json({ error: "Você não pode remover a si mesmo da equipe." });
    }

    if (membro.papel === "admin") {
      const { count } = await supabase
        .from("conta_membros")
        .select("id", { count: "exact", head: true })
        .eq("conta_id", auth.contaId)
        .eq("papel", "admin");

      if ((count ?? 0) <= 1) {
        return res.status(400).json({ error: "A conta precisa de pelo menos um admin." });
      }
    }

    const { error: errDelete } = await supabase.from("conta_membros").delete().eq("id", membro.id);
    if (errDelete) throw errDelete;

    await logSystemEvent(supabase, {
      tipo: "membro_removido",
      nivel: "info",
      mensagem: "Membro removido da equipe",
      detalhes: {
        membroId: id,
        userId: membro.user_id,
        email: membro.usuarios?.email ?? null,
      },
      usuarioId: auth.userId,
      contaId: auth.contaId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("remover-membro:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
