import { getSupabase } from "../_lib.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "32kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { linkId } = req.body || {};
    const id = String(linkId ?? "").trim();
    if (!id) return res.status(400).json({ error: "linkId é obrigatório." });

    const supabase = getSupabase();
    const { error } = await supabase.from("leads_links").delete().eq("id", id);

    if (error) {
      console.error("excluir-link:", error);
      return res.status(500).json({ error: "Erro ao excluir link." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("excluir-link:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
