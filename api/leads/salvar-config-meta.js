import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const { metaPixelId, metaAccessToken, metaTestEventCode } = req.body || {};

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from("leads_config")
      .select("id")
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    const row = {
      conta_id: auth.contaId,
      meta_pixel_id: metaPixelId !== undefined ? String(metaPixelId).trim() || null : undefined,
      meta_access_token:
        metaAccessToken !== undefined ? String(metaAccessToken).trim() || null : undefined,
      meta_test_event_code:
        metaTestEventCode !== undefined ? String(metaTestEventCode).trim() || null : undefined,
      updated_at: new Date().toISOString(),
    };

    const updates = Object.fromEntries(
      Object.entries(row).filter(([, v]) => v !== undefined)
    );

    if (!existing?.id) {
      const { error } = await supabase.from("leads_config").insert(updates);
      if (error) throw error;
    } else {
      const { conta_id: _c, ...patch } = updates;
      const { error } = await supabase.from("leads_config").update(patch).eq("id", existing.id);
      if (error) throw error;
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("salvar-config-meta:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
