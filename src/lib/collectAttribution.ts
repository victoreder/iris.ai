function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export interface AttributionData {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landingUrl: string;
  userAgent: string;
  fbp: string | null;
  fbc: string | null;
}

export function collectAttribution(): AttributionData {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    fbclid: params.get("fbclid"),
    gclid: params.get("gclid"),
    ttclid: params.get("ttclid"),
    referrer: document.referrer || null,
    landingUrl: window.location.href,
    userAgent: navigator.userAgent,
    fbp: getCookie("_fbp"),
    fbc: getCookie("_fbc"),
  };
}
