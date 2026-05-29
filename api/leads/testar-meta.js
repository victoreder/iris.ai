import { getSupabase } from "../_lib.js";
import { sendMetaTestEvent } from "../_lib/metaConversions.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { logLeadsEvent } from "../_lib/leadsLogger.js";

export const config = { api: { bodyParser: { sizeLimit: "16kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const supabase = getSupabase();
    const body = await sendMetaTestEvent();
    await logLeadsEvent({
      supabase,
      tipo: "meta",
      nivel: "sucesso",
      mensagem: "Evento de teste enviado à Meta (botão admin)",
      detalhes: { result: body },
    });
    return res.status(200).json({ success: true, result: body });
  } catch (err) {
    console.error("testar-meta:", err);
    const supabase = getSupabase();
    await logLeadsEvent({
      supabase,
      tipo: "meta",
      nivel: "erro",
      mensagem: `Falha no teste Meta: ${err?.message}`,
    });
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
