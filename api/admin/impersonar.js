import { getSupabase } from "../_lib.js";
import { requireSuperadmin, logSystemEvent } from "../_lib/auth.js";
import { getAuthClient } from "../_lib/supabaseAdmin.js";
import { getSupabaseEnv } from "../_lib/env.js";
import { corsLeads } from "../_lib/leadsUtils.js";

async function createSessionForEmail(admin, email) {
  const { url, anonKey } = getSupabaseEnv();
  if (!anonKey) {
    throw new Error("Configure VITE_SUPABASE_ANON_KEY ou SUPABASE_ANON_KEY no .env.");
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    throw new Error(linkErr?.message ?? "Erro ao gerar sessão.");
  }

  const authBase = url.replace(/\/+$/, "");
  const verifyRes = await fetch(`${authBase}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      type: "magiclink",
      token_hash: tokenHash,
    }),
  });

  const payload = await verifyRes.json().catch(() => ({}));
  if (!verifyRes.ok || !payload.access_token || !payload.refresh_token) {
    const msg =
      payload.msg ??
      payload.error_description ??
      payload.error ??
      "Falha ao criar sessão do usuário.";
    throw new Error(String(msg));
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  };
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireSuperadmin(req, res);
  if (!auth) return;

  try {
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório." });
    }

    const supabase = getSupabase();
    const admin = getAuthClient();

    const { data: alvo, error: errAlvo } = await supabase
      .from("usuarios")
      .select("id, email, nome, superadmin")
      .eq("id", userId)
      .maybeSingle();

    if (errAlvo || !alvo) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (alvo.superadmin) {
      return res.status(400).json({ error: "Não é permitido impersonar outro superadmin." });
    }

    const session = await createSessionForEmail(admin, alvo.email);

    await logSystemEvent(supabase, {
      tipo: "impersonate",
      nivel: "info",
      mensagem: `Superadmin impersonou ${alvo.email}`,
      detalhes: { alvoId: userId, superadminId: auth.user.id },
      usuarioId: auth.user.id,
    });

    return res.status(200).json({
      success: true,
      email: alvo.email,
      nome: alvo.nome,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  } catch (err) {
    console.error("impersonar:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
