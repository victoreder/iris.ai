import { getSupabase } from "../_lib.js";
import { requireSuperadmin, logSystemEvent } from "../_lib/auth.js";
import { getAuthClient } from "../_lib/supabaseAdmin.js";
import { corsLeads } from "../_lib/leadsUtils.js";

import { enviarEmailBoasVindas } from "../_lib/emails/boasVindas.js";
import { calcularRenovacao } from "../_lib/vencimento.js";

const SENHA_PADRAO = "Padrao123456";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireSuperadmin(req, res);
  if (!auth) return;

  try {
    const { email, telefone, planoSlug = "free", planoId } = req.body || {};

    const emailTrim = String(email ?? "").trim().toLowerCase();
    const tel = String(telefone ?? "").trim();
    const nome = emailTrim.split("@")[0] || "Usuário";

    if (!emailTrim) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }

    const supabase = getSupabase();
    const admin = getAuthClient();

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: emailTrim,
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (authErr || !authUser?.user) {
      return res.status(400).json({ error: authErr?.message ?? "Erro ao criar usuário no auth." });
    }

    const userId = authUser.user.id;

    const { error: errUsuario } = await supabase.from("usuarios").insert({
      id: userId,
      email: emailTrim,
      nome,
      superadmin: false,
    });

    if (errUsuario) {
      await admin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: errUsuario.message });
    }

    let planoUuid = planoId ?? null;
    let recorrencia = "mensal";
    if (!planoUuid && planoSlug) {
      const { data: plano } = await supabase
        .from("planos")
        .select("id, recorrencia")
        .eq("slug", planoSlug)
        .maybeSingle();
      planoUuid = plano?.id ?? null;
      recorrencia = plano?.recorrencia ?? "mensal";
    } else if (planoUuid) {
      const { data: plano } = await supabase
        .from("planos")
        .select("recorrencia")
        .eq("id", planoUuid)
        .maybeSingle();
      recorrencia = plano?.recorrencia ?? "mensal";
    }

    const dataVencimento = calcularRenovacao(null, recorrencia);

    const tempSlug = `pendente-${userId.slice(0, 8)}`;

    const { data: conta, error: errConta } = await supabase
      .from("contas")
      .insert({
        nome: "Pendente",
        slug: tempSlug,
        plano_id: planoUuid,
        status: "ativa",
        telefone: tel || null,
        email_contato: emailTrim,
        onboarding_pendente: true,
        data_vencimento: dataVencimento,
      })
      .select("*")
      .single();

    if (errConta || !conta) {
      await supabase.from("usuarios").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: errConta?.message ?? "Erro ao criar conta." });
    }

    const { error: errMembro } = await supabase.from("conta_membros").insert({
      conta_id: conta.id,
      user_id: userId,
      papel: "admin",
    });

    if (errMembro) {
      await supabase.from("contas").delete().eq("id", conta.id);
      await supabase.from("usuarios").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: errMembro.message });
    }

    await logSystemEvent(supabase, {
      tipo: "conta_criada",
      nivel: "sucesso",
      mensagem: `Conta provisionada para ${emailTrim}`,
      detalhes: { contaId: conta.id, userId, planoId: planoUuid },
      usuarioId: auth.user.id,
      contaId: conta.id,
    });

    enviarEmailBoasVindas({
      email: emailTrim,
      nome,
      senhaTemporaria: SENHA_PADRAO,
      nomeConta: conta.nome,
    }).catch((err) => console.error("email boas-vindas:", err));

    return res.status(200).json({
      success: true,
      conta,
      usuario: { id: userId, email: emailTrim, nome },
      senhaPadrao: SENHA_PADRAO,
    });
  } catch (err) {
    console.error("criar-cliente:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
