import { getLeadsWebhookUrl } from "../_lib/evolutionLeads.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const webhookUrl = getLeadsWebhookUrl();
    return res.status(200).json({ webhookUrl });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? "BACKEND_PUBLIC_URL não configurado." });
  }
}
