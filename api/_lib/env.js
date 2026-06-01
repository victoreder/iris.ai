export function getSupabaseEnv() {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const anonKey =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    "";
  return { url, serviceRoleKey, anonKey };
}

export function getAppPublicUrl() {
  const raw =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.VITE_APP_PUBLIC_URL?.trim() ||
    "";
  return raw.replace(/\/+$/, "");
}
