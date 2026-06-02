import { requireContaAuth } from "../_lib/auth.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import {
  getMetaAccessTokenForConta,
  getMetaActiveCampaignsTree,
} from "../_lib/metaMarketing.js";

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const auth = await requireContaAuth(req, res, { minPapel: "visualizador" });
  if (!auth) return;

  try {
    const adAccountId = String(req.query?.adAccountId ?? "").trim();
    if (!adAccountId) {
      return res.status(400).json({ error: "adAccountId é obrigatório." });
    }

    const accessToken = await getMetaAccessTokenForConta(auth.contaId);
    const campaigns = await getMetaActiveCampaignsTree(accessToken, adAccountId);
    return res.status(200).json({ campaigns });
  } catch (err) {
    console.error("meta-campanhas-mensagem:", err);
    return res.status(500).json({ error: err?.message ?? "Erro ao buscar campanhas Meta." });
  }
}
