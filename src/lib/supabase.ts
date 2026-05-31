import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase não configurado. Copie .env.example para .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY."
    );
  }
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}

/** Cliente Supabase — só use após isSupabaseConfigured === true */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});
