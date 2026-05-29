import { getSupabase } from "../_lib.js";
import {
  evolutionCreateInstance,
  evolutionSetWebhook,
  getLeadsWebhookUrl,
} from "../_lib/evolutionLeads.js";
import { corsLeads, slugifyLeadLink } from "../_lib/leadsUtils.js";
import { ensureContatoInicialEtapa } from "../_lib/leadsJornada.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { nome, instanceName: instanceInput } = req.body || {};
    const nomeTrim = String(nome ?? "").trim();
    if (!nomeTrim) return res.status(400).json({ error: "Nome é obrigatório." });

    const instanceName = slugifyLeadLink(instanceInput || nomeTrim).replace(/-/g, "_");
    if (!instanceName || instanceName.length < 2) {
      return res.status(400).json({ error: "Nome da instância inválido." });
    }

    const supabase = getSupabase();

    const { data: existing } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id")
      .eq("instance_name", instanceName)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: "Já existe uma instância com este nome." });
    }

    await evolutionCreateInstance(instanceName);

    let webhookConfigurado = false;
    let webhookErro = null;
    try {
      await evolutionSetWebhook(instanceName);
      webhookConfigurado = true;
    } catch (e) {
      webhookErro = e?.message ?? "Falha ao configurar webhook.";
      console.error("criar-instancia webhook:", e);
    }

    const { data: row, error: errInsert } = await supabase
      .from("leads_instancias_whatsapp")
      .insert({
        nome: nomeTrim,
        instance_name: instanceName,
        status: "conectando",
        webhook_configurado: webhookConfigurado,
        webhook_erro: webhookErro,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (errInsert) {
      console.error("criar-instancia db:", errInsert);
      return res.status(500).json({ error: "Erro ao salvar instância." });
    }

    try {
      await ensureContatoInicialEtapa(supabase, row.id);
    } catch (e) {
      console.error("criar-instancia etapa inicial:", e);
    }

    const webhookUrl = getLeadsWebhookUrl();

    return res.status(200).json({
      success: true,
      instancia: row,
      webhookUrl,
    });
  } catch (err) {
    console.error("criar-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
