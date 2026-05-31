import { getSupabase } from "../_lib.js";
import { logSystemEvent } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { enviarLembretesVencimentoAmanha } from "../_lib/vencimentoEmails.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const secret = process.env.CRON_SECRET?.trim();
  const headerSecret = String(req.headers["x-cron-secret"] ?? "").trim();
  const authHeader = String(req.headers.authorization ?? "");
  const bearerSecret =
    authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  const authorized =
    secret && (headerSecret === secret || bearerSecret === secret);

  if (!authorized) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const supabase = getSupabase();

    let lembretes = { enviados: 0, candidatas: 0 };
    try {
      lembretes = await enviarLembretesVencimentoAmanha(supabase);
    } catch (err) {
      console.error("lembretes vencimento:", err);
    }

    const { data, error } = await supabase.rpc("verificar_vencimentos_contas");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const suspensas = Number(data) || 0;

    if (suspensas > 0) {
      await logSystemEvent(supabase, {
        tipo: "cron_vencimentos",
        nivel: "aviso",
        mensagem: `${suspensas} conta(s) suspensa(s) por vencimento`,
        detalhes: { suspensas },
      });
    }

    return res.status(200).json({
      success: true,
      suspensas,
      lembretesVencimento: lembretes.enviados,
      candidatasVencimentoAmanha: lembretes.candidatas,
    });
  } catch (err) {
    console.error("verificar-vencimentos:", err);
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
