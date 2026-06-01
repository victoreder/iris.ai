import { getSupabase } from "../_lib.js";
import { requireSuperadmin, logSystemEvent } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

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

    const { data: contaAntes, error: errAntes } = await supabase
      .from("contas")
      .select("id, nome, onboarding_pendente")
      .eq("id", contaId)
      .single();

    if (errAntes || !contaAntes) {
      return res.status(404).json({ error: "Conta não encontrada." });
    }

    if (contaAntes.onboarding_pendente) {
      return res.status(400).json({ error: "Esta conta já está em onboarding." });
    }

    const { data: conta, error: errUpdate } = await supabase
      .from("contas")
      .update({
        onboarding_pendente: true,
        onboarding_etapa_atual: 1,
        onboarding_concluido_em: null,
        empresa_tamanho_funcionarios: null,
        empresa_como_conheceu: null,
        campanha_estilo_principal: null,
      })
      .eq("id", contaId)
      .select("*")
      .single();

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    await logSystemEvent(supabase, {
      tipo: "onboarding_reativado",
      nivel: "info",
      mensagem: `Onboarding reativado para ${contaAntes.nome}`,
      detalhes: { contaId },
      usuarioId: auth.user.id,
      contaId,
    }).catch((err) => console.error("log onboarding_reativado:", err));

    return res.status(200).json({ success: true, conta });
  } catch (err) {
    console.error("ativar-onboarding:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
