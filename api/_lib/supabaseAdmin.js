import { createClient } from "@supabase/supabase-js";
import { getAppPublicUrl, getSupabaseEnv } from "./env.js";

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

async function findAuthUserByEmail(admin, emailTrim) {
  let page = 1;
  const perPage = 200;

  for (let i = 0; i < 10; i += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u) => u.email?.toLowerCase() === emailTrim);
    if (found) return found;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function ensureUsuarioRow(supabase, { userId, emailTrim, nome }) {
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (usuario) return;

  await supabase.from("usuarios").insert({
    id: userId,
    email: emailTrim,
    nome: nome || emailTrim.split("@")[0],
    superadmin: false,
  });
}

/** Busca usuário existente ou envia convite Supabase para criar conta. */
export async function inviteOrLinkUsuarioByEmail(supabase, admin, { email, nome }) {
  const emailTrim = email.trim().toLowerCase();
  const nomeTrim = String(nome ?? "").trim();

  const { data: usuarioExistente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", emailTrim)
    .maybeSingle();

  if (usuarioExistente?.id) {
    return { userId: usuarioExistente.id, created: false, invited: false };
  }

  const authUser = await findAuthUserByEmail(admin, emailTrim);
  if (authUser) {
    await ensureUsuarioRow(supabase, {
      userId: authUser.id,
      emailTrim,
      nome: nomeTrim || authUser.user_metadata?.nome,
    });
    return { userId: authUser.id, created: false, invited: false };
  }

  const appUrl = getAppPublicUrl() || "http://localhost:5175";
  const redirectTo = `${appUrl}/auth/convite`;

  const { data: linkData, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: emailTrim,
    options: {
      data: { nome: nomeTrim || undefined },
      redirectTo,
    },
  });

  if (inviteError || !linkData?.user) {
    throw new Error(inviteError?.message ?? "Erro ao gerar convite.");
  }

  const inviteLink = linkData.properties?.action_link ?? null;

  await ensureUsuarioRow(supabase, {
    userId: linkData.user.id,
    emailTrim,
    nome: nomeTrim,
  });

  return {
    userId: linkData.user.id,
    created: true,
    invited: true,
    inviteLink,
  };
}

/** @deprecated Prefer inviteOrLinkUsuarioByEmail */
export async function provisionUsuarioByEmail(supabase, admin, { email, nome, password }) {
  const emailTrim = email.trim().toLowerCase();

  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === emailTrim);

  if (existing) {
    await ensureUsuarioRow(supabase, {
      userId: existing.id,
      emailTrim,
      nome: nome || existing.user_metadata?.nome,
    });
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

  await ensureUsuarioRow(supabase, {
    userId: created.user.id,
    emailTrim,
    nome: nome || emailTrim.split("@")[0],
  });

  return { userId: created.user.id, created: true };
}
