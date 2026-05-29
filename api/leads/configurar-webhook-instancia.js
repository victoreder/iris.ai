import { getSupabase } from "../_lib.js";
import { evolutionSetWebhook, getLeadsWebhookUrl } from "../_lib/evolutionLeads.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { instanciaId } = req.body || {};
    const id = String(instanciaId ?? "").trim();
    if (!id) return res.status(400).json({ error: "instanciaId é obrigatório." });

    const supabase = getSupabase();
    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id, instance_name")
      .eq("id", id)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(404).json({ error: "Instância não encontrada." });
    }

    let webhookConfigurado = false;
    let webhookErro = null;
    try {
      await evolutionSetWebhook(inst.instance_name);
      webhookConfigurado = true;
    } catch (e) {
      webhookErro = e?.message ?? "Falha ao configurar webhook.";
      return res.status(500).json({ error: webhookErro });
    }

    await supabase
      .from("leads_instancias_whatsapp")
      .update({
        webhook_configurado: webhookConfigurado,
        webhook_erro: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return res.status(200).json({
      success: true,
      webhookUrl: getLeadsWebhookUrl(),
      webhookConfigurado,
    });
  } catch (err) {
    console.error("configurar-webhook-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
