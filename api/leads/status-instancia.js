import { getSupabase } from "../_lib.js";
import { resolveInstancePhone } from "../_lib/evolutionLeads.js";
import { corsLeads } from "../_lib/leadsUtils.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const instanciaId = String(req.query?.instanciaId ?? "").trim();
    if (!instanciaId) {
      return res.status(400).json({ error: "instanciaId é obrigatório." });
    }

    const supabase = getSupabase();
    const { data: inst, error: errInst } = await supabase
      .from("leads_instancias_whatsapp")
      .select("*")
      .eq("id", instanciaId)
      .maybeSingle();

    if (errInst || !inst) {
      return res.status(404).json({ error: "Instância não encontrada." });
    }

    const { connected, state, telefone: telefoneEvo } = await resolveInstancePhone(
      inst.instance_name
    );

    const telefone = telefoneEvo || inst.telefone || null;
    const status = connected && telefone ? "conectado" : connected ? "conectando" : "conectando";

    await supabase
      .from("leads_instancias_whatsapp")
      .update({
        status: telefone ? "conectado" : status,
        telefone: telefone ? String(telefone).replace(/\D/g, "") : inst.telefone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", instanciaId);

    return res.status(200).json({
      success: true,
      status: telefone ? "conectado" : status,
      state: String(state),
      telefone: telefone || null,
      connected: Boolean(telefone) || connected,
    });
  } catch (err) {
    console.error("status-instancia:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
