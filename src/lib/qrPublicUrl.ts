/** Base pública para links de QR (ex.: https://qrcode.dominio.com.br) */
export function getQrPublicBaseUrl(): string {
  const base = (import.meta.env.VITE_QR_PUBLIC_URL as string | undefined)?.trim();
  return base ? base.replace(/\/+$/, "") : "";
}

export function buildQrShareUrl(token: string): string {
  const base = getQrPublicBaseUrl();
  if (!base) return `${window.location.origin}/q/${token}`;
  return `${base}/q/${token}`;
}
