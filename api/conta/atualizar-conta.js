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
    const { nome, emailContato, telefone } = req.body || {};
    const nomeTrim = String(nome ?? "").trim();

    if (!nomeTrim) {
      return res.status(400).json({ error: "Nome da empresa é obrigatório." });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("contas")
      .update({
        nome: nomeTrim,
        email_contato: emailContato !== undefined ? String(emailContato).trim() || null : null,
        telefone: telefone !== undefined ? String(telefone).trim() || null : null,
      })
      .eq("id", auth.contaId);

    if (error) throw error;

    await logSystemEvent(supabase, {
      tipo: "conta_atualizada",
      nivel: "info",
      mensagem: "Dados da empresa atualizados",
      detalhes: { nome: nomeTrim },
      usuarioId: auth.userId,
      contaId: auth.contaId,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("atualizar-conta:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
