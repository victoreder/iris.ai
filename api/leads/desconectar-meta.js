import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from("leads_config")
      .select("id")
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (!existing?.id) {
      return res.status(200).json({ success: true, connected: false });
    }

    const { error } = await supabase
      .from("leads_config")
      .update({
        meta_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;

    return res.status(200).json({ success: true, connected: false });
  } catch (err) {
    console.error("desconectar-meta:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
