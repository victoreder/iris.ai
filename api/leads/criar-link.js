import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import {
  corsLeads,
  ensureUniqueLeadLinkSlug,
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

  const auth = await requireContaAuth(req, res, { minPapel: "membro" });
  if (!auth) return;

  try {
    const { nome, instanciaId, mensagemInicial } = req.body || {};
    const nomeTrim = String(nome ?? "").trim();
    const mensagem = String(mensagemInicial ?? "").trim();
    const instancia = String(instanciaId ?? "").trim();

    if (!nomeTrim) return res.status(400).json({ error: "Nome é obrigatório." });
    if (!mensagem) return res.status(400).json({ error: "Mensagem inicial é obrigatória." });
    if (!instancia) return res.status(400).json({ error: "Selecione um WhatsApp." });

    const supabase = getSupabase();

    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id, telefone, status, conta_id")
      .eq("id", instancia)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(400).json({ error: "Instância WhatsApp não encontrada." });
    }

    const slug = await ensureUniqueLeadLinkSlug(supabase);

    const { data: inserted, error: errInsert } = await supabase
      .from("leads_links")
      .insert({
        conta_id: auth.contaId,
        nome: nomeTrim,
        slug,
        instancia_id: instancia,
        mensagem_inicial: mensagem,
        ativo: true,
        created_by: auth.userId,
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
