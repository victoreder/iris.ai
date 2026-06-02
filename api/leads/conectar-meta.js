import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { exchangeMetaShortLivedToken, listMetaPixels } from "../_lib/metaOAuth.js";
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
    const accessToken = String(req.body?.accessToken ?? "").trim();
    if (!accessToken) {
      return res.status(400).json({ error: "Token de acesso Meta ausente." });
    }

    const { accessToken: longLivedToken } = await exchangeMetaShortLivedToken(accessToken);
    const pixels = await listMetaPixels(longLivedToken);

    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from("leads_config")
      .select("id, meta_pixel_id")
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    const pixelId =
      pixels.length === 1
        ? pixels[0].id
        : pixels.find((p) => p.id === existing?.meta_pixel_id)?.id ?? null;

    const row = {
      conta_id: auth.contaId,
      meta_access_token: longLivedToken,
      meta_pixel_id: pixelId ?? existing?.meta_pixel_id ?? null,
      updated_at: new Date().toISOString(),
    };

    if (!existing?.id) {
      const { error } = await supabase.from("leads_config").insert(row);
      if (error) throw error;
    } else {
      const { conta_id: _c, ...patch } = row;
      const { error } = await supabase.from("leads_config").update(patch).eq("id", existing.id);
      if (error) throw error;
    }

    return res.status(200).json({
      success: true,
      connected: true,
      pixels,
      pixelId,
    });
  } catch (err) {
    console.error("conectar-meta:", err);
    return res.status(500).json({ error: err?.message ?? "Erro ao conectar Meta." });
  }
}
