import { getSupabase } from "../_lib.js";
import { getSupabaseEnv } from "./env.js";
import { createClient } from "@supabase/supabase-js";

let supabaseAuthClient = null;

function getAuthClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env da raiz.");
  }
  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseAuthClient;
}

export async function getUsuarioFromToken(token) {
  const { data, error } = await getAuthClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireAuth(req, res) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Não autenticado." });
    return null;
  }
  const user = await getUsuarioFromToken(token);
  if (!user) {
    res.status(401).json({ error: "Token inválido ou expirado." });
    return null;
  }

  const supabase = getSupabase();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, email, nome, superadmin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !usuario) {
    res.status(403).json({
      error: "Usuário não provisionado. Contate o administrador do sistema.",
    });
    return null;
  }

  return { user, usuario, token };
}

export async function requireSuperadmin(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  if (!auth.usuario.superadmin) {
    res.status(403).json({ error: "Acesso restrito a superadmin." });
    return null;
  }
  return auth;
}

/**
 * Valida JWT + membership na conta (header X-Conta-Id).
 */
export async function requireContaAuth(req, res, { minPapel } = {}) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const contaId = String(req.headers["x-conta-id"] ?? "").trim();
  if (!contaId) {
    res.status(400).json({ error: "Header X-Conta-Id obrigatório." });
    return null;
  }

  if (auth.usuario.superadmin) {
    return { userId: auth.user.id, contaId, papel: "admin", usuario: auth.usuario, superadmin: true };
  }

  const supabase = getSupabase();
  const { data: membro, error: membroError } = await supabase
    .from("conta_membros")
    .select("papel")
    .eq("conta_id", contaId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (membroError || !membro) {
    res.status(403).json({ error: "Sem acesso a esta conta." });
    return null;
  }

  const papel = membro.papel;
  const ranks = { visualizador: 0, membro: 1, admin: 2 };
  if (minPapel && ranks[papel] < ranks[minPapel]) {
    const labels = { visualizador: "visualizador", membro: "membro", admin: "administrador" };
    res.status(403).json({
      error: `Permissão insuficiente. Esta ação exige perfil ${labels[minPapel] ?? minPapel} da conta.`,
    });
    return null;
  }

  return { userId: auth.user.id, contaId, papel, usuario: auth.usuario, superadmin: false };
}

export async function logSystemEvent(supabase, { tipo, mensagem, nivel = "info", detalhes, usuarioId, contaId }) {
  await supabase.from("system_logs").insert({
    tipo,
    nivel,
    mensagem,
    detalhes: detalhes ?? null,
    usuario_id: usuarioId ?? null,
    conta_id: contaId ?? null,
  });
}
