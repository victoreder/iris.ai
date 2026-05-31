import crypto from "crypto";
import { getSupabase } from "../_lib.js";
import { onlyDigits } from "./leadsUtils.js";
import { logLeadsEvent } from "./leadsLogger.js";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhone(phone) {
  const d = onlyDigits(phone);
  if (!d) return null;
  if (d.length >= 10 && d.length <= 11 && !d.startsWith("55")) {
    return sha256(`55${d}`);
  }
  return sha256(d);
}

async function getLeadsConfig(contaId) {
  const supabase = getSupabase();
  if (!contaId) {
    const { data, error } = await supabase.from("leads_config").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("leads_config")
    .select("*")
    .eq("conta_id", contaId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {object} params
 * @param {object} params.clique - row leads_cliques
 * @param {object} [params.link] - row leads_links
 * @param {string} params.eventName - ex. Lead, Purchase
 * @param {string} [params.eventId] - idempotência Meta
 * @param {number|null} [params.value] - valor para Purchase
 * @param {string} [params.currency] - default BRL
 */
export async function sendMetaConversionEvent({
  clique,
  link,
  eventName,
  eventId,
  value = null,
  currency = "BRL",
  supabase: existingSupabase = null,
}) {
  const supabase = existingSupabase ?? getSupabase();
  const config = await getLeadsConfig(clique.conta_id);
  const pixelId = String(config?.meta_pixel_id ?? "").trim();
  const accessToken = String(config?.meta_access_token ?? "").trim();

  const name = String(eventName ?? "Lead").trim() || "Lead";
  const eid = String(eventId ?? `lead_${clique.id}`).trim();

  if (!pixelId || !accessToken) {
    await logLeadsEvent({
      supabase,
      tipo: "meta",
      nivel: "aviso",
      mensagem: "Meta CAPI omitido: Pixel ou token não configurado",
      cliqueId: clique?.id,
      linkId: clique?.link_id,
    });
    return { ok: false, skipped: true, error: "Meta Pixel ID ou Access Token não configurados." };
  }

  const eventTime = Math.floor(
    new Date(clique.convertido_at || clique.created_at || Date.now()).getTime() / 1000
  );

  const userData = {};
  if (clique.telefone_lead) {
    const ph = normalizePhone(clique.telefone_lead);
    if (ph) userData.ph = [ph];
  }
  if (clique.ip_address) userData.client_ip_address = clique.ip_address;
  if (clique.user_agent) userData.client_user_agent = clique.user_agent;
  if (clique.fbc) userData.fbc = clique.fbc;
  if (clique.fbp) userData.fbp = clique.fbp;

  const customData = {
    link_id: clique.link_id,
    tracking_id: clique.id,
  };
  if (link?.slug) customData.slug = link.slug;
  if (clique.utm_source) customData.utm_source = clique.utm_source;
  if (clique.utm_medium) customData.utm_medium = clique.utm_medium;
  if (clique.utm_campaign) customData.utm_campaign = clique.utm_campaign;
  if (clique.utm_content) customData.utm_content = clique.utm_content;
  if (clique.utm_term) customData.utm_term = clique.utm_term;

  if (name === "Purchase" && value != null && !Number.isNaN(Number(value))) {
    customData.value = Number(value);
    customData.currency = currency;
  }

  const payload = {
    data: [
      {
        event_name: name,
        event_time: eventTime,
        event_id: eid,
        action_source: "website",
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  const testCode = String(config?.meta_test_event_code ?? "").trim();
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg =
      body?.error?.message || body?.message || `Meta API HTTP ${res.status}`;
    await logLeadsEvent({
      supabase,
      tipo: "meta",
      nivel: "erro",
      mensagem: `Falha ao enviar evento Meta: ${errMsg}`,
      cliqueId: clique.id,
      linkId: clique.link_id,
      detalhes: { eventId: eid, eventName: name, response: body },
    });
    return { ok: false, error: errMsg, body, eventId: eid };
  }

  await logLeadsEvent({
    supabase,
    tipo: "meta",
    nivel: "sucesso",
    mensagem: `Evento "${name}" enviado à Meta (event_id: ${eid})`,
    cliqueId: clique.id,
    linkId: clique.link_id,
    detalhes: {
      eventId: eid,
      eventName: name,
      events_received: body?.events_received,
      fbtrace_id: body?.fbtrace_id,
    },
  });

  return { ok: true, eventId: eid, body };
}

/** @deprecated use sendMetaConversionEvent */
export async function sendMetaLeadEvent({ clique, link, supabase }) {
  return sendMetaConversionEvent({
    clique,
    link,
    eventName: "Lead",
    eventId: `lead_${clique.id}`,
    supabase,
  });
}

/**
 * Envia evento Meta da etapa se ainda não enviado para este clique+etapa.
 */
export async function sendMetaForEtapa({ supabase, clique, link, etapa, force = false }) {
  if (!etapa?.id) return { ok: false, skipped: true };

  const { data: prev } = await supabase
    .from("leads_cliques_meta_envios")
    .select("id, meta_enviado")
    .eq("clique_id", clique.id)
    .eq("etapa_id", etapa.id)
    .maybeSingle();

  if (prev?.meta_enviado && !force) {
    return { ok: true, skipped: true, reason: "already_sent" };
  }

  const eventName = String(etapa.evento_meta ?? "Lead").trim() || "Lead";
  const eventId = `lead_${clique.id}_etapa_${etapa.id}`;
  const value =
    etapa.representa_venda && etapa.valor_venda != null ? Number(etapa.valor_venda) : null;

  const metaResult = await sendMetaConversionEvent({
    clique,
    link,
    eventName,
    eventId,
    value,
    supabase,
  });

  const row = {
    clique_id: clique.id,
    etapa_id: etapa.id,
    evento_meta: eventName,
    meta_event_id: metaResult.eventId || eventId,
    meta_enviado: metaResult.ok === true,
    meta_erro: metaResult.error || (metaResult.skipped ? metaResult.error : null),
  };

  if (prev?.id) {
    await supabase.from("leads_cliques_meta_envios").update(row).eq("id", prev.id);
  } else {
    await supabase.from("leads_cliques_meta_envios").insert(row);
  }

  if (metaResult.ok) {
    await supabase
      .from("leads_cliques")
      .update({
        meta_enviado: true,
        meta_event_id: metaResult.eventId,
        meta_erro: null,
        meta_enviado_at: new Date().toISOString(),
      })
      .eq("id", clique.id);
  }

  return metaResult;
}

/** Evento de teste manual (admin). */
export async function sendMetaTestEvent(contaId) {
  const config = await getLeadsConfig(contaId);
  const pixelId = String(config?.meta_pixel_id ?? "").trim();
  const accessToken = String(config?.meta_access_token ?? "").trim();
  const testCode = String(config?.meta_test_event_code ?? "").trim();

  if (!pixelId || !accessToken) {
    throw new Error("Configure Pixel ID e Access Token antes de testar.");
  }

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: `test_${Date.now()}`,
        action_source: "website",
        user_data: {
          client_ip_address: "127.0.0.1",
          client_user_agent: "Viziom-Leads-Test",
        },
      },
    ],
  };
  if (testCode) payload.test_event_code = testCode;

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message || `Meta API HTTP ${res.status}`);
  }
  return body;
}
