import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./_lib/env.js";

let supabaseClient = null;

export function getSupabase() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!url || !serviceRoleKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env da raiz.");
  }
  if (!supabaseClient) {
    supabaseClient = createClient(url, serviceRoleKey);
  }
  return supabaseClient;
}
