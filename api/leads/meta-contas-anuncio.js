import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import { getMetaAccessTokenForConta, listMetaAdAccounts } from "../_lib/metaMarketing.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "visualizador" });
  if (!auth) return;

  try {
    const accessToken = await getMetaAccessTokenForConta(auth.contaId);
    const accounts = await listMetaAdAccounts(accessToken);
    return res.status(200).json({ accounts });
  } catch (err) {
    console.error("meta-contas-anuncio:", err);
    return res.status(500).json({ error: err?.message ?? "Erro ao listar contas Meta." });
  }
}
