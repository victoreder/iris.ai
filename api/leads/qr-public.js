import { getSupabase } from "../_lib.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { fetchFreshQrcode, resolveQrShareToken } from "../_lib/qrShare.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const token = String(req.query?.token ?? "").trim();
    if (!token) {
      return res.status(400).json({ error: "Token é obrigatório." });
    }

    const supabase = getSupabase();
    const resolved = await resolveQrShareToken(supabase, token);

    if (!resolved) {
      return res.status(404).json({ error: "Link inválido ou expirado." });
    }

    if (resolved.expired) {
      return res.status(410).json({ error: "Este link expirou. Solicite um novo link ao administrador." });
    }

    const { instancia, empresaNome } = resolved;

    if (instancia.status === "conectado" || instancia.telefone) {
      return res.status(200).json({
        success: true,
        alreadyConnected: true,
        empresaNome,
        telefone: instancia.telefone,
      });
    }

    const qrcode = await fetchFreshQrcode(instancia.instance_name);

    if (!qrcode) {
      return res.status(502).json({ error: "Não foi possível gerar o QR Code. Tente novamente em instantes." });
    }

    await supabase
      .from("leads_instancias_whatsapp")
      .update({ status: "conectando", updated_at: new Date().toISOString() })
      .eq("id", instancia.id);

    return res.status(200).json({
      success: true,
      qrcode,
      empresaNome,
      alreadyConnected: false,
    });
  } catch (err) {
    console.error("qr-public:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
