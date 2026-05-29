import { getSupabase } from "../_lib.js";
import { corsLeads, isValidLeadSlug, slugifyLeadLink } from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { linkId, nome, slug, instanciaId, mensagemInicial, ativo } = req.body || {};
    const id = String(linkId ?? "").trim();
    if (!id) return res.status(400).json({ error: "linkId é obrigatório." });

    const updates = {};
    if (nome !== undefined) {
      const n = String(nome).trim();
      if (!n) return res.status(400).json({ error: "Nome inválido." });
      updates.nome = n;
    }
    if (mensagemInicial !== undefined) {
      const m = String(mensagemInicial).trim();
      if (!m) return res.status(400).json({ error: "Mensagem inválida." });
      updates.mensagem_inicial = m;
    }
    if (instanciaId !== undefined) {
      updates.instancia_id = String(instanciaId).trim();
    }
    if (ativo !== undefined) {
      updates.ativo = Boolean(ativo);
    }
    if (slug !== undefined) {
      const s = slugifyLeadLink(slug);
      if (!isValidLeadSlug(s)) {
        return res.status(400).json({ error: "Slug inválido." });
      }
      updates.slug = s;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nada para atualizar." });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads_links")
      .update(updates)
      .eq("id", id)
      .select("id, nome, slug, instancia_id, mensagem_inicial, ativo, created_at")
      .single();

    if (error) {
      console.error("atualizar-link:", error);
      if (error.code === "23505") {
        return res.status(400).json({ error: "Este slug já está em uso." });
      }
      return res.status(500).json({ error: "Erro ao atualizar link." });
    }

    return res.status(200).json({ success: true, link: data });
  } catch (err) {
    console.error("atualizar-link:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
