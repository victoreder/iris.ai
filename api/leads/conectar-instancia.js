import { getSupabase } from "../_lib.js";
import { evolutionConnectInstance } from "../_lib/evolutionLeads.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const instanciaId = String(req.query?.instanciaId ?? "").trim();
    if (!instanciaId) {
      return res.status(400).json({ error: "instanciaId é obrigatório." });
    }

    const supabase = getSupabase();
    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id, instance_name, status")
      .eq("id", instanciaId)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(404).json({ error: "Instância não encontrada." });
    }

    const data = await evolutionConnectInstance(inst.instance_name);

    const qrcode =
      data?.qrcode?.base64 ||
      data?.base64 ||
      data?.code ||
      (typeof data?.qrcode === "string" ? data.qrcode : null);

    await supabase
      .from("leads_instancias_whatsapp")
      .update({ status: "conectando", updated_at: new Date().toISOString() })
      .eq("id", instanciaId);

    return res.status(200).json({
      success: true,
      qrcode,
      pairingCode: data?.pairingCode || null,
    });
  } catch (err) {
    console.error("conectar-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
