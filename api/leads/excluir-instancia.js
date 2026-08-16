import { getSupabase } from "../_lib.js";
import { requireContaAuth } from "../_lib/auth.js";
import { evolutionDeleteInstance, hasUazapiToken } from "../_lib/evolutionLeads.js";
import { corsLeads } from "../_lib/leadsUtils.js";

function isUazapiNotFoundError(err) {
  const msg = String(err?.message ?? "").toLowerCase();
  const status = err?.status;
  return status === 404 || msg.includes("not found") || msg.includes("does not exist");
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "admin" });
  if (!auth) return;

  try {
    const { instanciaId } = req.body || {};
    const id = String(instanciaId ?? "").trim();
    if (!id) return res.status(400).json({ error: "instanciaId é obrigatório." });

    const supabase = getSupabase();

    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("id, instance_name, token_instancia")
      .eq("id", id)
      .eq("conta_id", auth.contaId)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(404).json({ error: "Instância não encontrada." });
    }

    const { error: errLinks } = await supabase
      .from("leads_links")
      .delete()
      .eq("instancia_id", id)
      .eq("conta_id", auth.contaId);

    if (errLinks) {
      console.error("excluir-instancia links:", errLinks);
      return res.status(500).json({ error: "Erro ao remover links vinculados." });
    }

    if (hasUazapiToken(inst)) {
      try {
        await evolutionDeleteInstance(inst.token_instancia);
      } catch (e) {
        if (!isUazapiNotFoundError(e)) {
          console.error("excluir-instancia uazapi:", e);
          return res.status(500).json({
            error: e?.message ?? "Erro ao excluir instância na UAZAPI.",
          });
        }
        console.warn("excluir-instancia: instância já ausente na UAZAPI:", inst.instance_name);
      }
    }

    const { error: errDelete } = await supabase
      .from("leads_instancias_whatsapp")
      .delete()
      .eq("id", id)
      .eq("conta_id", auth.contaId);

    if (errDelete) {
      console.error("excluir-instancia db:", errDelete);
      return res.status(500).json({ error: "Erro ao excluir instância." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("excluir-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
