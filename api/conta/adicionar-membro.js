import { getSupabase } from "../_lib.js";
import { requireContaAuth, logSystemEvent } from "../_lib/auth.js";
import { getAuthClient, provisionUsuarioByEmail } from "../_lib/supabaseAdmin.js";
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
    const { email, nome, papel = "membro", senhaTemporaria } = req.body || {};
    const emailTrim = String(email ?? "").trim().toLowerCase();
    const nomeTrim = String(nome ?? "").trim();

    if (!emailTrim) {
      return res.status(400).json({ error: "E-mail é obrigatório." });
    }

    const supabase = getSupabase();
    const admin = getAuthClient();

    const { userId, created } = await provisionUsuarioByEmail(supabase, admin, {
      email: emailTrim,
      nome: nomeTrim,
      password: senhaTemporaria,
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
      papel,
    });

    if (errInsert) {
      return res.status(500).json({ error: errInsert.message });
    }

    await logSystemEvent(supabase, {
      tipo: "membro_adicionado",
      nivel: "info",
      mensagem: `${emailTrim} adicionado à conta`,
      detalhes: { userId, created, papel },
      usuarioId: auth.userId,
      contaId: auth.contaId,
    });

    return res.status(200).json({ success: true, userId, created });
  } catch (err) {
    console.error("adicionar-membro:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
