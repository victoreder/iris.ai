import { getSupabase } from "../_lib.js";
import { buildWhatsAppMessage } from "./leadTrackingCodec.js";
import {
  buildWaMeUrl,
  generateTrackingId,
  getClientIp,
  onlyDigits,
  parseUserAgent,
} from "./leadsUtils.js";
import { logLeadsEvent } from "./leadsLogger.js";

function parseCookieHeader(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = String(cookieHeader).match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {Record<string, unknown>} input
 */
export function attributionFromRequest(req, input = {}) {
  const q = req.query || {};
  const ua = String(input.userAgent ?? req.headers["user-agent"] ?? "");
  const cookieHeader = req.headers.cookie;

  return {
    utmSource: input.utmSource ?? q.utm_source ?? null,
    utmMedium: input.utmMedium ?? q.utm_medium ?? null,
    utmCampaign: input.utmCampaign ?? q.utm_campaign ?? null,
    utmContent: input.utmContent ?? q.utm_content ?? null,
    utmTerm: input.utmTerm ?? q.utm_term ?? null,
    fbclid: input.fbclid ?? q.fbclid ?? null,
    gclid: input.gclid ?? q.gclid ?? null,
    ttclid: input.ttclid ?? q.ttclid ?? null,
    referrer: input.referrer ?? req.headers.referer ?? req.headers.referrer ?? null,
    landingUrl: input.landingUrl ?? null,
    userAgent: ua,
    fbp: input.fbp ?? parseCookieHeader(cookieHeader, "_fbp"),
    fbc: input.fbc ?? parseCookieHeader(cookieHeader, "_fbc"),
    ip: getClientIp(req),
  };
}

/**
 * Registra clique e monta URL do WhatsApp.
 * @returns {Promise<{ ok: true, waUrl: string, trackingId: string } | { ok: false, status: number, error: string }>}
 */
export async function registrarCliqueCore(slugRaw, attribution, { supabase: existingSupabase } = {}) {
  const slugTrim = String(slugRaw ?? "").trim();
  if (!slugTrim) {
    return { ok: false, status: 400, error: "slug é obrigatório." };
  }

  const supabase = existingSupabase ?? getSupabase();

  const { data: link, error: errLink } = await supabase
    .from("leads_links")
    .select(
      `
        id,
        nome,
        slug,
        mensagem_inicial,
        ativo,
        conta_id,
        instancia_id,
        leads_instancias_whatsapp (
          id,
          telefone,
          instance_name
        )
      `
    )
    .eq("slug", slugTrim)
    .maybeSingle();

  if (errLink) {
    console.error("registrar-clique link:", errLink);
    return { ok: false, status: 500, error: "Erro ao buscar link." };
  }

  if (!link || !link.ativo) {
    void logLeadsEvent({
      supabase,
      tipo: "clique",
      nivel: "erro",
      mensagem: `Clique recusado: link inativo ou inexistente (${slugTrim})`,
      detalhes: { slug: slugTrim },
    });
    return { ok: false, status: 404, error: "Link não encontrado ou inativo." };
  }

  const instancia = link.leads_instancias_whatsapp;
  if (!instancia?.instance_name) {
    return { ok: false, status: 400, error: "Instância WhatsApp não configurada." };
  }

  const telefoneInstancia = instancia.telefone ? onlyDigits(instancia.telefone) : "";

  if (!telefoneInstancia) {
    void logLeadsEvent({
      supabase,
      tipo: "clique",
      nivel: "erro",
      mensagem: "Clique sem WhatsApp conectado (telefone da instância ausente)",
      linkId: link.id,
      contaId: link.conta_id,
      instanceName: instancia.instance_name,
      detalhes: { slug: slugTrim, instancia_id: instancia.id },
    });
    return {
      ok: false,
      status: 400,
      error:
        "WhatsApp ainda sem número salvo. No app, abra Channels → clique em atualizar status após conectar.",
    };
  }

  const trackingId = generateTrackingId();
  const ua = String(attribution.userAgent ?? "");
  const { device_type, browser, os } = parseUserAgent(ua);

  const row = {
    id: trackingId,
    conta_id: link.conta_id,
    link_id: link.id,
    instancia_id: instancia.id,
    utm_source: attribution.utmSource ? String(attribution.utmSource).trim() : null,
    utm_medium: attribution.utmMedium ? String(attribution.utmMedium).trim() : null,
    utm_campaign: attribution.utmCampaign ? String(attribution.utmCampaign).trim() : null,
    utm_content: attribution.utmContent ? String(attribution.utmContent).trim() : null,
    utm_term: attribution.utmTerm ? String(attribution.utmTerm).trim() : null,
    fbclid: attribution.fbclid ? String(attribution.fbclid).trim() : null,
    gclid: attribution.gclid ? String(attribution.gclid).trim() : null,
    ttclid: attribution.ttclid ? String(attribution.ttclid).trim() : null,
    referrer: attribution.referrer ? String(attribution.referrer).trim() : null,
    landing_url: attribution.landingUrl ? String(attribution.landingUrl).trim() : null,
    ip_address: attribution.ip ? String(attribution.ip) : null,
    user_agent: ua || null,
    device_type,
    browser,
    os,
    fbp: attribution.fbp ? String(attribution.fbp).trim() : null,
    fbc: attribution.fbc ? String(attribution.fbc).trim() : null,
    status: "aguardando",
  };

  const { error: errInsert } = await supabase.from("leads_cliques").insert(row);
  if (errInsert) {
    console.error("registrar-clique insert:", errInsert);
    void logLeadsEvent({
      supabase,
      tipo: "clique",
      nivel: "erro",
      mensagem: "Falha ao salvar clique no banco",
      linkId: link.id,
      contaId: link.conta_id,
      cliqueId: trackingId,
      detalhes: { error: errInsert.message },
    });
    return { ok: false, status: 500, error: "Erro ao registrar clique." };
  }

  const fullMessage = buildWhatsAppMessage(link.mensagem_inicial, trackingId);
  const waUrl = buildWaMeUrl(telefoneInstancia, fullMessage);
  if (!waUrl) {
    return { ok: false, status: 400, error: "Telefone da instância inválido." };
  }

  void logLeadsEvent({
    supabase,
    tipo: "clique",
    nivel: "sucesso",
    mensagem: `Clique registrado no link "${link.nome}" (${slugTrim})`,
    linkId: link.id,
    cliqueId: trackingId,
    instanceName: instancia.instance_name,
    detalhes: {
      utm_source: row.utm_source,
      utm_medium: row.utm_medium,
      utm_campaign: row.utm_campaign,
      ip: row.ip_address,
      device_type: row.device_type,
    },
  });

  return { ok: true, waUrl, trackingId };
}
