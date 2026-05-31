import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
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

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const supabase = getSupabase();
    const body = await sendMetaTestEvent(auth.contaId);
    await logLeadsEvent({
      supabase,
      contaId: auth.contaId,
      tipo: "meta",
      nivel: "sucesso",
      mensagem: "Evento de teste enviado à Meta",
      detalhes: { result: body },
    });
    return res.status(200).json({ success: true, result: body });
  } catch (err) {
    console.error("testar-meta:", err);
    const supabase = getSupabase();
    await logLeadsEvent({
      supabase,
      contaId: auth.contaId,
      tipo: "meta",
      nivel: "erro",
      mensagem: `Falha no teste Meta: ${err?.message}`,
    });
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
