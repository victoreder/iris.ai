import { getSupabase } from "../_lib.js";
import { requireSuperadmin, logSystemEvent } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { calcularRenovacao } from "../_lib/vencimento.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireSuperadmin(req, res);
  if (!auth) return;

  try {
    const { contaId } = req.body || {};
    if (!contaId) {
      return res.status(400).json({ error: "contaId é obrigatório." });
    }

    const supabase = getSupabase();

    const { data: conta, error: errConta } = await supabase
      .from("contas")
      .select("*, planos(recorrencia)")
      .eq("id", contaId)
      .single();

    if (errConta || !conta) {
      return res.status(404).json({ error: "Conta não encontrada." });
    }

    const recorrencia = conta.planos?.recorrencia ?? "mensal";
    const novaVencimento = calcularRenovacao(conta.data_vencimento, recorrencia);

    const { data: updated, error: errUpdate } = await supabase
      .from("contas")
      .update({
        status: "ativa",
        data_vencimento: novaVencimento,
        lembrete_vencimento_para: null,
      })
      .eq("id", contaId)
      .select("*")
      .single();

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    await logSystemEvent(supabase, {
      tipo: "pagamento_registrado",
      nivel: "sucesso",
      mensagem: `Pagamento registrado — vencimento ${new Date(novaVencimento).toLocaleDateString("pt-BR")}`,
      detalhes: { contaId, recorrencia, data_vencimento: novaVencimento },
      usuarioId: auth.user.id,
      contaId,
    }).catch((err) => console.error("log pagamento:", err));

    return res.status(200).json({ success: true, conta: updated });
  } catch (err) {
    console.error("registrar-pagamento:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
