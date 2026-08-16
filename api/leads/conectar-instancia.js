import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { createQrShareToken, fetchFreshQrcode } from "../_lib/qrShare.js";
import { ensureUazapiInstance } from "../_lib/evolutionLeads.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const instanciaId = String(req.query?.instanciaId ?? "").trim();
    if (!instanciaId) {
      return res.status(400).json({ error: "instanciaId é obrigatório." });
    }

    const supabase = getSupabase();
    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("*")
      .eq("id", instanciaId)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(404).json({ error: "Instância não encontrada." });
    }

    const ready = await ensureUazapiInstance(supabase, inst);
    const qrcode = await fetchFreshQrcode(ready.token_instancia);

    await supabase
      .from("leads_instancias_whatsapp")
      .update({ status: "conectando", updated_at: new Date().toISOString() })
      .eq("id", instanciaId);

    const { shareUrl } = await createQrShareToken(supabase, instanciaId);

    return res.status(200).json({
      success: true,
      qrcode,
      qrCode: qrcode,
      base64: qrcode,
      shareUrl,
    });
  } catch (err) {
    console.error("conectar-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
