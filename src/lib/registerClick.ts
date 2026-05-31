import type { AttributionData } from "./collectAttribution";

const backendBase = (import.meta.env.VITE_BACKEND_URL ?? "").replace(/\/+$/, "");

export interface RegisterClickResult {
  ok: boolean;
  waUrl?: string;
  error?: string;
}

export async function registerLeadClick(
  slug: string,
  attribution: AttributionData,
  options?: { metaPageView?: boolean }
): Promise<RegisterClickResult> {
  if (!backendBase) {
    return { ok: false, error: "Backend não configurado." };
  }

  const res = await fetch(`${backendBase}/api/leads/registrar-clique`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      metaPageView: options?.metaPageView === true,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmContent: attribution.utmContent,
      utmTerm: attribution.utmTerm,
      fbclid: attribution.fbclid,
      gclid: attribution.gclid,
      ttclid: attribution.ttclid,
      referrer: attribution.referrer,
      landingUrl: attribution.landingUrl,
      userAgent: attribution.userAgent,
      fbp: attribution.fbp,
      fbc: attribution.fbc,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Erro ao registrar clique." };
  }

  return { ok: true, waUrl: data.waUrl };
}
