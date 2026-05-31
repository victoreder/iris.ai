const GO_PUBLIC_BASE = (
  import.meta.env.VITE_GO_URL as string | undefined
)?.trim()?.replace(/\/+$/, "") || "https://go.dominio";

export function getLeadPublicUrl(slug: string): string {
  return `${GO_PUBLIC_BASE}/l/${slug}`;
}

/** Link para Meta Ads: aguarda 5s na landing, envia PageView e redireciona ao WhatsApp. */
export function getLeadMetaAdsUrl(slug: string): string {
  return `${GO_PUBLIC_BASE}/l/${slug}?meta=1`;
}

export function slugifyLeadLink(input: string): string {
  return (
    String(input ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || ""
  );
}

export function isValidLeadSlug(slug: string): boolean {
  const s = String(slug ?? "");
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
  ) {
    return true;
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 2;
}

export function buildInstanceName(nome: string, custom?: string): string {
  const raw = (custom ?? "").trim() || nome.trim();
  return slugifyLeadLink(raw).replace(/-/g, "_");
}

export function isValidInstanceName(name: string): boolean {
  return name.length >= 2;
}

export function slugifyConta(input: string): string {
  return slugifyLeadLink(input);
}
