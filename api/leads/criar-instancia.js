import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import {
  evolutionCreateInstance,
  evolutionSetWebhook,
  getLeadsWebhookUrl,
} from "../_lib/evolutionLeads.js";
import {
  buildInstanceName,
  corsLeads,
  ensureUniqueInstanceName,
  isValidInstanceName,
} from "../_lib/leadsUtils.js";
import { ensureContatoInicialEtapa } from "../_lib/leadsJornada.js";
import { assertCanCreateWhatsApp } from "../_lib/planoLimites.js";

function isEvolutionNameTakenError(err) {
  const msg = String(err?.message ?? "").toLowerCase();
  return err?.status === 403 && msg.includes("already in use");
}

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const { nome, instanceName: instanceInput } = req.body || {};
    const nomeTrim = String(nome ?? "").trim();
    if (!nomeTrim) return res.status(400).json({ error: "Nome é obrigatório." });

    const baseInstanceName = buildInstanceName(instanceInput, nomeTrim);
    if (!isValidInstanceName(baseInstanceName)) {
      return res.status(400).json({
        error: "Nome da instância inválido — use pelo menos 2 letras ou números.",
      });
    }

    const supabase = getSupabase();
    await assertCanCreateWhatsApp(supabase, auth.contaId);
    const instanceName = await ensureUniqueInstanceName(supabase, baseInstanceName);

    try {
      await evolutionCreateInstance(instanceName);
    } catch (e) {
      if (!isEvolutionNameTakenError(e)) throw e;
      console.warn("criar-instancia: reutilizando instância existente na Evolution:", instanceName);
    }

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
        conta_id: auth.contaId,
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
      await ensureContatoInicialEtapa(supabase, row.id, auth.contaId);
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
    const status = err?.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    return res.status(status).json({ error: err?.message ?? "Erro interno." });
  }
}
