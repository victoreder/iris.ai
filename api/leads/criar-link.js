import { getSupabase } from "../_lib.js";
import {
  corsLeads,
  ensureUniqueLeadSlug,
  isValidLeadSlug,
  slugifyLeadLink,
} from "../_lib/leadsUtils.js";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

function cors(res) {
  corsLeads(res);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const { nome, slug: slugInput, instanciaId, mensagemInicial, createdBy } = req.body || {};
    const nomeTrim = String(nome ?? "").trim();
    const mensagem = String(mensagemInicial ?? "").trim();
    const instancia = String(instanciaId ?? "").trim();

    if (!nomeTrim) return res.status(400).json({ error: "Nome é obrigatório." });
    if (!mensagem) return res.status(400).json({ error: "Mensagem inicial é obrigatória." });
    if (!instancia) return res.status(400).json({ error: "Selecione um WhatsApp." });

    const baseSlug = slugifyLeadLink(slugInput || nomeTrim);
    if (!isValidLeadSlug(baseSlug)) {
      return res.status(400).json({
        error: "Slug inválido. Use letras minúsculas, números e hífens (mín. 2 caracteres).",
      });
    }

    const supabase = getSupabase();

    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id, telefone, status")
      .eq("id", instancia)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(400).json({ error: "Instância WhatsApp não encontrada." });
    }

    const slug = await ensureUniqueLeadSlug(supabase, baseSlug);

    const { data: inserted, error: errInsert } = await supabase
      .from("leads_links")
      .insert({
        nome: nomeTrim,
        slug,
        instancia_id: instancia,
        mensagem_inicial: mensagem,
        ativo: true,
        created_by: createdBy || null,
      })
      .select("id, nome, slug, instancia_id, mensagem_inicial, ativo, created_at")
      .single();

    if (errInsert) {
      console.error("criar-link:", errInsert);
      return res.status(500).json({ error: "Erro ao criar link." });
    }

    return res.status(200).json({ success: true, link: inserted });
  } catch (err) {
    console.error("criar-link:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
