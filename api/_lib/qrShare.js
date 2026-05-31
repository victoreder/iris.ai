import { randomUUID } from "crypto";
import { evolutionConnectInstance } from "./evolutionLeads.js";

const DEFAULT_TTL_HOURS = 48;

export function extractQrcodeFromEvolution(data) {
  return (
    data?.qrcode?.base64 ||
    data?.base64 ||
    data?.code ||
    (typeof data?.qrcode === "string" ? data.qrcode : null)
  );
}

export function getQrPublicBaseUrl() {
  const base = String(
    process.env.QR_PUBLIC_URL?.trim() ||
      process.env.VITE_QR_PUBLIC_URL?.trim() ||
      ""
  ).replace(/\/+$/, "");
  return base;
}

export function buildQrShareUrl(token) {
  const base = getQrPublicBaseUrl();
  if (!base) return `/q/${token}`;
  return `${base}/q/${token}`;
}

/** Cria token de compartilhamento (substitui o anterior da mesma instância). */
export async function createQrShareToken(supabase, instanciaId, { ttlHours = DEFAULT_TTL_HOURS } = {}) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  await supabase.from("leads_qr_share_tokens").delete().eq("instancia_id", instanciaId);

  const { error } = await supabase.from("leads_qr_share_tokens").insert({
    token,
    instancia_id: instanciaId,
    expires_at: expiresAt,
  });

  if (error) throw error;

  return { token, expiresAt, shareUrl: buildQrShareUrl(token) };
}

export async function resolveQrShareToken(supabase, token) {
  const id = String(token ?? "").trim();
  if (!id) return null;

  const { data: row, error } = await supabase
    .from("leads_qr_share_tokens")
    .select(
      `
      token,
      expires_at,
      instancia_id,
      leads_instancias_whatsapp (
        id,
        instance_name,
        status,
        telefone,
        conta_id,
        contas ( nome, onboarding_pendente )
      )
    `
    )
    .eq("token", id)
    .maybeSingle();

  if (error || !row) return null;

  if (new Date(row.expires_at) < new Date()) {
    return { expired: true };
  }

  const inst = row.leads_instancias_whatsapp;
  if (!inst) return null;

  const conta = inst.contas;
  const empresaNome =
    conta?.onboarding_pendente || !conta?.nome?.trim()
      ? "sua empresa"
      : conta.nome.trim();

  return {
    expired: false,
    instancia: inst,
    empresaNome,
    instanciaNome: inst.instance_name,
  };
}

export async function fetchFreshQrcode(instanceName) {
  const data = await evolutionConnectInstance(instanceName);
  return extractQrcodeFromEvolution(data);
}
