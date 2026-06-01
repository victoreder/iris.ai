import { getSupabase } from "../_lib.js";
import { requireContaAuth, logSystemEvent } from "../_lib/auth.js";
import { getAuthClient, inviteOrLinkUsuarioByEmail } from "../_lib/supabaseAdmin.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { enviarEmailConviteMembroExistente } from "../_lib/emails/conviteMembroExistente.js";
import { enviarEmailConviteMembroNovo } from "../_lib/emails/conviteMembroNovo.js";

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
    const { email, nome, papel = "membro" } = req.body || {};
    const emailTrim = String(email ?? "").trim().toLowerCase();
    const nomeTrim = String(nome ?? "").trim();
    const papelNorm = String(papel ?? "membro").trim();

    if (!emailTrim) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }
    if (!PAPEIS.has(papelNorm)) {
      return res.status(400).json({ error: "Papel inválido." });
    }

    const supabase = getSupabase();
    const admin = getAuthClient();

    const { data: conta, error: errConta } = await supabase
      .from("contas")
      .select("nome")
      .eq("id", auth.contaId)
      .maybeSingle();

    if (errConta || !conta) {
      return res.status(500).json({ error: errConta?.message ?? "Conta não encontrada." });
    }

    const { userId, created, invited, inviteLink } = await inviteOrLinkUsuarioByEmail(supabase, admin, {
      email: emailTrim,
      nome: nomeTrim,
    });

    const { data: existingMembro } = await supabase
      .from("conta_membros")
      .select("id")
      .eq("conta_id", auth.contaId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMembro) {
      return res.status(400).json({ error: "Usuário já pertence a esta conta." });
    }

    const { error: errInsert } = await supabase.from("conta_membros").insert({
      conta_id: auth.contaId,
      user_id: userId,
      papel: papelNorm,
    });

    if (errInsert) {
      return res.status(500).json({ error: errInsert.message });
    }

    await logSystemEvent(supabase, {
      tipo: "membro_adicionado",
      nivel: "info",
      mensagem: `${emailTrim} adicionado à conta`,
      detalhes: { userId, created, invited, papel: papelNorm },
      usuarioId: auth.userId,
      contaId: auth.contaId,
    });

    const emailParams = {
      email: emailTrim,
      nome: nomeTrim,
      nomeEmpresa: conta.nome,
      convidadoPor: auth.usuario?.nome ?? auth.usuario?.email,
    };

    if (invited) {
      enviarEmailConviteMembroNovo({
        ...emailParams,
        inviteLink,
      }).catch((err) => console.error("email convite membro novo:", err));
    } else if (!created) {
      enviarEmailConviteMembroExistente(emailParams).catch((err) =>
        console.error("email convite membro existente:", err),
      );
    }

    return res.status(200).json({ success: true, userId, created, invited });
  } catch (err) {
    console.error("adicionar-membro:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
