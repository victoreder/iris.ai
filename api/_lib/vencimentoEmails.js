import {
  getEmailDestinoConta,
  isVencimentoAmanha,
  precisaLembreteVencimento,
} from "./contaEmail.js";
import { enviarEmailVencimentoAmanha } from "./emails/vencimentoAmanha.js";

/**
 * Envia lembretes "vence amanhã" e marca lembrete_vencimento_para.
 * Retorna quantidade de e-mails enviados (ou tentados).
 */
export async function enviarLembretesVencimentoAmanha(supabase) {
  const { data: contas, error } = await supabase
    .from("contas")
    .select("id, nome, email_contato, data_vencimento, lembrete_vencimento_para, status, onboarding_pendente")
    .eq("status", "ativa")
    .eq("onboarding_pendente", false)
    .not("data_vencimento", "is", null);

  if (error) throw error;

  let enviados = 0;

  for (const conta of contas ?? []) {
    if (!precisaLembreteVencimento(conta)) continue;

    const destino = await getEmailDestinoConta(supabase, conta);
    if (!destino) {
      console.warn("[vencimento] Sem e-mail para conta", conta.id);
      continue;
    }

    try {
      await enviarEmailVencimentoAmanha({
        email: destino,
        nomeConta: conta.nome,
        dataVencimento: conta.data_vencimento,
      });

      await supabase
        .from("contas")
        .update({ lembrete_vencimento_para: conta.data_vencimento })
        .eq("id", conta.id);

      enviados += 1;
    } catch (err) {
      console.error("[vencimento] Falha ao enviar lembrete:", conta.id, err);
    }
  }

  return { enviados, candidatas: (contas ?? []).filter((c) => isVencimentoAmanha(c.data_vencimento)).length };
}
