/** Resolve o e-mail de destino de uma conta (contato ou admin). */

export async function getEmailDestinoConta(supabase, conta) {
  const contato = conta.email_contato?.trim().toLowerCase();
  if (contato) return contato;

  const { data: membros } = await supabase
    .from("conta_membros")
    .select("user_id, papel")
    .eq("conta_id", conta.id)
    .in("papel", ["admin", "membro"]);

  if (!membros?.length) return null;

  const userIds = membros.map((m) => m.user_id);
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, email, superadmin")
    .in("id", userIds);

  const elegiveis = (usuarios ?? []).filter((u) => !u.superadmin && u.email);
  const adminMembro = membros.find((m) => m.papel === "admin");
  const adminUser = elegiveis.find((u) => u.id === adminMembro?.user_id);
  if (adminUser?.email) return adminUser.email.trim().toLowerCase();

  return elegiveis[0]?.email?.trim().toLowerCase() ?? null;
}

/** Contas com vencimento no dia seguinte (horário local do servidor). */
export function isVencimentoAmanha(dataVencimento) {
  if (!dataVencimento) return false;
  const hoje = startOfDay(new Date());
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);
  const venc = startOfDay(new Date(dataVencimento));
  return venc.getTime() === amanha.getTime();
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Evita reenviar o lembrete para o mesmo vencimento. */
export function precisaLembreteVencimento(conta) {
  if (!conta.data_vencimento) return false;
  if (!isVencimentoAmanha(conta.data_vencimento)) return false;
  const enviado = conta.lembrete_vencimento_para;
  if (!enviado) return true;
  return new Date(enviado).getTime() !== new Date(conta.data_vencimento).getTime();
}
