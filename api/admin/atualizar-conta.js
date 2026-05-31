import { getSupabase } from "../_lib.js";
import { requireSuperadmin, logSystemEvent } from "../_lib/auth.js";
import { getEmailDestinoConta } from "../_lib/contaEmail.js";
import { enviarEmailPlanoAlterado } from "../_lib/emails/planoAlterado.js";
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
    const { contaId, nome, status, planoId, dataVencimento } = req.body || {};
    if (!contaId) {
      return res.status(400).json({ error: "contaId é obrigatório." });
    }

    const supabase = getSupabase();

    const { data: contaAntes, error: errAntes } = await supabase
      .from("contas")
      .select("*, planos(id, nome, slug)")
      .eq("id", contaId)
      .single();

    if (errAntes || !contaAntes) {
      return res.status(404).json({ error: "Conta não encontrada." });
    }

    const payload = {};
    if (status !== undefined) payload.status = status;
    if (planoId !== undefined) payload.plano_id = planoId || null;
    if (dataVencimento !== undefined) {
      payload.data_vencimento = dataVencimento
        ? new Date(`${String(dataVencimento).slice(0, 10)}T23:59:59`).toISOString()
        : null;
      payload.lembrete_vencimento_para = null;
    }
    if (nome !== undefined && !contaAntes.onboarding_pendente && String(nome).trim()) {
      payload.nome = String(nome).trim();
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar." });
    }

    const { data: conta, error: errUpdate } = await supabase
      .from("contas")
      .update(payload)
      .eq("id", contaId)
      .select("*, planos(id, nome, slug)")
      .single();

    if (errUpdate) {
      return res.status(500).json({ error: errUpdate.message });
    }

    const planoMudou =
      planoId !== undefined &&
      String(contaAntes.plano_id ?? "") !== String(conta.plano_id ?? "");

    let emailPlano = null;
    if (planoMudou) {
      let planoAnteriorNome = contaAntes.planos?.nome ?? null;
      if (!planoAnteriorNome && contaAntes.plano_id) {
        const { data: p } = await supabase
          .from("planos")
          .select("nome")
          .eq("id", contaAntes.plano_id)
          .maybeSingle();
        planoAnteriorNome = p?.nome ?? null;
      }

      let planoNovoNome = conta.planos?.nome ?? null;
      if (!planoNovoNome && conta.plano_id) {
        const { data: p } = await supabase
          .from("planos")
          .select("nome")
          .eq("id", conta.plano_id)
          .maybeSingle();
        planoNovoNome = p?.nome ?? null;
      }

      const destino = await getEmailDestinoConta(supabase, conta);
      if (destino) {
        emailPlano = enviarEmailPlanoAlterado({
          email: destino,
          nomeConta: conta.nome,
          planoAnterior: planoAnteriorNome ?? "Sem plano",
          planoNovo: planoNovoNome ?? "Sem plano",
        }).catch((err) => {
          console.error("email plano alterado:", err);
          return { error: err?.message };
        });
      }
    }

    await logSystemEvent(supabase, {
      tipo: "conta_atualizada",
      nivel: "sucesso",
      mensagem: `Conta ${conta.nome} atualizada`,
      detalhes: { contaId, planoMudou },
      usuarioId: auth.user.id,
      contaId,
    }).catch((err) => console.error("log conta_atualizada:", err));

    if (emailPlano) await emailPlano;

    return res.status(200).json({ success: true, conta, planoMudou });
  } catch (err) {
    console.error("atualizar-conta:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
