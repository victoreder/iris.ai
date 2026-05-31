/**
 * Valida limite de WhatsApps do plano da conta.
 * @returns {{ current: number, max: number | null }}
 */
export async function getWhatsAppLimitStatus(supabase, contaId) {
  const { data: conta, error: errConta } = await supabase
    .from("contas")
    .select("id, planos(max_whatsapps)")
    .eq("id", contaId)
    .single();

  if (errConta || !conta) {
    const err = new Error("Conta não encontrada.");
    err.statusCode = 404;
    throw err;
  }

  const max = conta.planos?.max_whatsapps ?? null;

  const { count, error: errCount } = await supabase
    .from("leads_instancias_whatsapp")
    .select("id", { count: "exact", head: true })
    .eq("conta_id", contaId);

  if (errCount) {
    const err = new Error("Erro ao verificar instâncias.");
    err.statusCode = 500;
    throw err;
  }

  return {
    current: count ?? 0,
    max: max == null ? null : Number(max),
  };
}

/** @throws {Error & { statusCode?: number }} */
export async function assertCanCreateWhatsApp(supabase, contaId) {
  const { current, max } = await getWhatsAppLimitStatus(supabase, contaId);
  if (max != null && current >= max) {
    const err = new Error(
      `Limite do plano atingido: máximo de ${max} WhatsApp(s). Exclua uma instância ou faça upgrade do plano.`
    );
    err.statusCode = 403;
    throw err;
  }
  return { current, max };
}
