import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import {
  exchangeMetaAuthCode,
  exchangeMetaShortLivedToken,
  listMetaPixels,
} from "../_lib/metaOAuth.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

async function saveMetaConnection(contaId, longLivedToken) {
  const pixels = await listMetaPixels(longLivedToken);

  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("leads_config")
    .select("id, meta_pixel_id")
    .eq("conta_id", contaId)
    .maybeSingle();

  const pixelId =
    pixels.length === 1
      ? pixels[0].id
      : pixels.find((p) => p.id === existing?.meta_pixel_id)?.id ?? null;

  const row = {
    conta_id: contaId,
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

  return { pixels, pixelId };
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const code = String(req.body?.code ?? "").trim();
    const redirectUri = String(req.body?.redirectUri ?? "").trim();
    const accessToken = String(req.body?.accessToken ?? "").trim();

    let shortLivedToken = accessToken;
    if (code) {
      if (!redirectUri) {
        return res.status(400).json({ error: "redirect_uri ausente." });
      }
      const exchanged = await exchangeMetaAuthCode(code, redirectUri);
      shortLivedToken = exchanged.accessToken;
    }

    if (!shortLivedToken) {
      return res.status(400).json({ error: "Código ou token de acesso Meta ausente." });
    }

    const { accessToken: longLivedToken } = await exchangeMetaShortLivedToken(shortLivedToken);
    const { pixels, pixelId } = await saveMetaConnection(auth.contaId, longLivedToken);

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
