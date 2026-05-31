/** Dias por recorrência do plano. */
export function diasRecorrencia(recorrencia) {
  const map = {
    mensal: 30,
    trimestral: 90,
    semestral: 180,
    anual: 365,
  };
  return map[recorrencia] ?? 30;
}

/** Próxima data a partir de uma base + recorrência. */
export function calcularProximaVencimento(recorrencia, dataBase = new Date()) {
  const d = new Date(dataBase);
  d.setUTCDate(d.getUTCDate() + diasRecorrencia(recorrencia));
  return d.toISOString();
}

/**
 * Renovação: estende a partir do vencimento atual (se ainda válido) ou de hoje.
 * Evita perder dias quando o cliente paga antes.
 */
export function calcularRenovacao(vencimentoAtual, recorrencia) {
  const agora = new Date();
  let base = agora;
  if (vencimentoAtual) {
    const atual = new Date(vencimentoAtual);
    if (atual > agora) base = atual;
  }
  return calcularProximaVencimento(recorrencia, base);
}
