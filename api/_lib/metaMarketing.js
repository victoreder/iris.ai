import { getSupabase } from "../_lib.js";

const META_GRAPH_VERSION = "v25.0";

async function graphGet(path, accessToken, params = {}) {
  const qs = new URLSearchParams({
    ...params,
    access_token: accessToken,
  });
  const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}${path}?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error?.code;
    const message = body?.error?.message || `Meta API HTTP ${res.status}`;
    if (code === 200 || /missing permissions/i.test(String(message))) {
      throw new Error(
        "Token da Meta sem permissão para contas de anúncio. Desconecte e conecte de novo em Conectar Meta."
      );
    }
    throw new Error(message);
  }
  return body;
}

export async function getMetaAccessTokenForConta(contaId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads_config")
    .select("meta_access_token")
    .eq("conta_id", contaId)
    .maybeSingle();

  if (error) throw error;
  const token = String(data?.meta_access_token ?? "").trim();
  if (!token) {
    throw new Error("Meta não conectada. Conecte em Configurações → Conectar Meta.");
  }
  return token;
}

function normalizeAdAccountId(adAccountId) {
  const raw = String(adAccountId ?? "").trim();
  if (!raw) throw new Error("Conta de anúncio Meta ausente.");
  return raw.startsWith("act_") ? raw : `act_${raw.replace(/\D/g, "")}`;
}

function isActiveItem(item) {
  const status = String(item?.effective_status ?? item?.status ?? "").toUpperCase();
  return status === "ACTIVE";
}

/** Contas de anúncio acessíveis pelo token OAuth da conta Viziom. */
export async function listMetaAdAccounts(accessToken) {
  const body = await graphGet("/me/adaccounts", accessToken, {
    fields: "id,name,account_id,account_status,currency",
    limit: "100",
  });

  return (body?.data ?? [])
    .filter((account) => {
      const status = account?.account_status;
      return status === 1 || status === "ACTIVE" || status === "1";
    })
    .map((account) => ({
      id: String(account.id),
      name: String(account.name ?? account.id),
      accountId: account.account_id != null ? String(account.account_id) : null,
      currency: account.currency ? String(account.currency) : null,
    }));
}

function normalizeCampaignTree(campaigns) {
  return campaigns
    .filter(isActiveItem)
    .map((campaign) => ({
      id: String(campaign.id),
      name: String(campaign.name ?? campaign.id),
      status: String(campaign.effective_status ?? campaign.status ?? ""),
      objective: campaign.objective ? String(campaign.objective) : null,
      adsets: (campaign.adsets?.data ?? [])
        .filter(isActiveItem)
        .map((adset) => ({
          id: String(adset.id),
          name: String(adset.name ?? adset.id),
          status: String(adset.effective_status ?? adset.status ?? ""),
          ads: (adset.ads?.data ?? [])
            .filter(isActiveItem)
            .map((ad) => ({
              id: String(ad.id),
              name: String(ad.name ?? ad.id),
              status: String(ad.effective_status ?? ad.status ?? ""),
            })),
        })),
    }));
}

/** Campanhas ativas com conjuntos e anúncios aninhados. */
export async function getMetaActiveCampaignsTree(accessToken, adAccountId) {
  const accountId = normalizeAdAccountId(adAccountId);
  const body = await graphGet(`/${accountId}/campaigns`, accessToken, {
    fields:
      "id,name,status,effective_status,objective,adsets.limit(50){id,name,status,effective_status,ads.limit(50){id,name,status,effective_status}}",
    effective_status: JSON.stringify(["ACTIVE"]),
    limit: "100",
  });

  return normalizeCampaignTree(body?.data ?? []);
}
