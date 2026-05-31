import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env.js";

let adminClient = null;

export function getAuthClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/** Busca ou cria usuário auth + row em usuarios pelo e-mail. */
export async function provisionUsuarioByEmail(supabase, admin, { email, nome, password }) {
  const emailTrim = email.trim().toLowerCase();

  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === emailTrim);

  if (existing) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, email, nome")
      .eq("id", existing.id)
      .maybeSingle();

    if (!usuario) {
      await supabase.from("usuarios").insert({
        id: existing.id,
        email: emailTrim,
        nome: nome || existing.user_metadata?.nome || emailTrim.split("@")[0],
        superadmin: false,
      });
    }
    return { userId: existing.id, created: false };
  }

  if (!password || password.length < 6) {
    throw new Error("Senha temporária (mín. 6 caracteres) obrigatória para novo usuário.");
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: emailTrim,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (error || !created?.user) {
    throw new Error(error?.message ?? "Erro ao criar usuário.");
  }

  await supabase.from("usuarios").insert({
    id: created.user.id,
    email: emailTrim,
    nome: nome || emailTrim.split("@")[0],
    superadmin: false,
  });

  return { userId: created.user.id, created: true };
}
