import { getSupabase } from "../_lib.js";
import {
  extractMessageTextFromWebhookItem,
  extractSenderJid,
  phoneFromWebhookItem,
} from "../_lib/evolutionLeads.js";
import {
  extractEvolutionMessages,
  isJornadaWebhookMessage,
  isOutgoingFromInstance,
  resolveCliqueFromMessage,
  createDirectWhatsAppLead,
  summarizeWebhookMessage,
} from "../_lib/leadsWebhookMatch.js";
import {
  debugResolveEtapaFromMessage,
  getEtapasForInstancia,
  parsePalavrasChave,
} from "../_lib/leadsJornada.js";
import { sendMetaForEtapa } from "../_lib/metaConversions.js";
import { corsLeads } from "../_lib/leadsUtils.js";
import {
  logLeadsEvent,
  prepareWebhookBodyForLog,
  sanitizeForLog,
} from "../_lib/leadsLogger.js";
import { recordEtapaAlterada, recordLeadNovo } from "../_lib/leadEventos.js";
import { ensureFirstOrigem, resolveEffectiveLead } from "../_lib/leadOrigens.js";
import { recordLeadMensagem, markMensagemDisparouEtapa, extractMessageIdFromWebhookItem } from "../_lib/leadMensagens.js";

export const config = { api: { bodyParser: { sizeLimit: "512kb" } } };

async function validateKnownInstance(supabase, instanceName) {
  const name = String(instanceName ?? "").trim();
  if (!name) return { ok: false, reason: "instance_ausente" };

  const { data, error } = await supabase
    .from("leads_instancias_whatsapp")
    .select("id, instance_name, nome")
    .eq("instance_name", name)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "instance_desconhecida", instanceName: name };
  return { ok: true, instancia: data };
}

function shouldProcessEvent(event) {
  if (!event) return true;
  const e = event.toLowerCase();
  if (e.includes("message")) return true;
  if (e === "messages.upsert" || e === "messages_upsert") return true;
  return false;
}

async function applyEtapaToClique(supabase, {
  clique,
  trackingId,
  etapa,
  telefone,
  text,
  link,
  instance,
  matchMethod,
  isFirstConversion,
}) {
  if (!etapa) return;

  const now = new Date().toISOString();
  const updates = {
    etapa_id: etapa.id,
    etapa_atualizada_at: now,
  };

  if (isFirstConversion) {
    Object.assign(updates, {
      status: "convertido",
      telefone_lead: telefone || null,
      mensagem_recebida: text,
      convertido_at: now,
    });
  } else if (telefone && !clique.telefone_lead) {
    updates.telefone_lead = telefone;
  }

  let query = supabase.from("leads_cliques").update(updates).eq("id", trackingId);
  if (isFirstConversion) {
    query = query.eq("status", "aguardando");
  }

  const { data: updatedRow, error: errUpdate } = await query.select("id").maybeSingle();

  if (errUpdate) {
    await logLeadsEvent({
      supabase,
      tipo: "webhook",
      nivel: "erro",
      mensagem: "Erro ao atualizar etapa do lead",
      instanceName: instance,
      cliqueId: trackingId,
      detalhes: { error: errUpdate.message, etapaId: etapa.id },
    });
    return false;
  }

  if (isFirstConversion && !updatedRow) {
    return false;
  }

  const cliqueAtualizado = {
    ...clique,
    ...updates,
    telefone_lead: telefone || clique.telefone_lead,
    status: isFirstConversion ? "convertido" : clique.status,
  };

  if (isFirstConversion && updatedRow) {
    await recordLeadNovo(supabase, {
      contaId: clique.conta_id,
      cliqueId: trackingId,
      etapa,
      detalhes: { matchMethod, telefone: telefone || null },
    });
    const { data: cliqueFresh } = await supabase
      .from("leads_cliques")
      .select("*, leads_links(id, slug, nome, mensagem_inicial, instancia_id)")
      .eq("id", trackingId)
      .maybeSingle();
    await ensureFirstOrigem(supabase, { clique: cliqueFresh ?? cliqueAtualizado });
  }

  const etapaMudou = clique.etapa_id !== etapa.id;
  if (updatedRow && (etapaMudou || isFirstConversion)) {
    await recordEtapaAlterada(supabase, {
      contaId: clique.conta_id,
      cliqueId: trackingId,
      etapa,
      etapaAnteriorId: clique.etapa_id ?? null,
      detalhes: { matchMethod, origem: isFirstConversion ? "conversao" : "jornada" },
    });
  }

  await sendMetaForEtapa({
    supabase,
    clique: cliqueAtualizado,
    link,
    etapa,
  });

  await logLeadsEvent({
    supabase,
    tipo: "webhook",
    nivel: "sucesso",
    mensagem: isFirstConversion
      ? `Lead convertido (${matchMethod}) — etapa "${etapa.nome}"`
      : `Lead avançou para etapa "${etapa.nome}"`,
    instanceName: instance,
    cliqueId: trackingId,
    linkId: clique.link_id,
    detalhes: {
      etapaId: etapa.id,
      etapaNome: etapa.nome,
      matchMethod,
      telefone,
      preview: sanitizeForLog(text, 120),
    },
  });

  return true;
}

function resolveInstanciaId(clique) {
  return clique?.instancia_id ?? clique?.leads_links?.instancia_id ?? null;
}

async function persistLeadMensagem(supabase, { item, clique, trackingId, instanciaId, isOutgoing, text, instanceName }) {
  if (!clique?.conta_id || !trackingId) return;
  await recordLeadMensagem(supabase, {
    contaId: clique.conta_id,
    cliqueId: trackingId,
    instanciaId: instanciaId ?? resolveInstanciaId(clique),
    fromMe: isOutgoing,
    item,
    text: text ?? "",
    instanceName,
  });
}

export default async function handler(req, res) {
  corsLeads(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const supabase = getSupabase();

  try {
    const body = req.body || {};
    const { event, instance, messages } = extractEvolutionMessages(body);

    await logLeadsEvent({
      supabase,
      tipo: "webhook",
      nivel: "info",
      mensagem: `Webhook recebido (${event || "sem evento"})`,
      instanceName: instance,
      detalhes: {
        event: event || null,
        messagesCount: messages.length,
        instance: instance || null,
        mensagens: messages.map((m) =>
          summarizeWebhookMessage(m, extractMessageTextFromWebhookItem)
        ),
        payload: prepareWebhookBodyForLog(body),
      },
    });

    const instanceCheck = await validateKnownInstance(supabase, instance);

    if (!instanceCheck.ok) {
      await logLeadsEvent({
        supabase,
        tipo: "webhook",
        nivel: "aviso",
        mensagem: `Webhook ignorado: ${instanceCheck.reason}`,
        instanceName: instance,
        detalhes: instanceCheck,
      });
      return res.status(200).json({ ok: true, ignored: true, ...instanceCheck });
    }

    if (!shouldProcessEvent(event)) {
      await logLeadsEvent({
        supabase,
        tipo: "webhook",
        nivel: "info",
        mensagem: `Evento ignorado: ${event}`,
        instanceName: instance,
      });
      return res.status(200).json({ ok: true, ignored: true, reason: "event", event });
    }

    if (messages.length === 0) {
      await logLeadsEvent({
        supabase,
        tipo: "webhook",
        nivel: "aviso",
        mensagem: "Webhook sem mensagens no payload",
        instanceName: instance,
        detalhes: { event },
      });
      return res.status(200).json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const item of messages) {
      const isOutgoing = isOutgoingFromInstance(item);

      if (!isJornadaWebhookMessage(item)) {
        await logLeadsEvent({
          supabase,
          tipo: "webhook",
          nivel: "info",
          mensagem: "Mensagem ignorada (grupo, broadcast ou direção desconhecida)",
          instanceName: instance,
          detalhes: {
            ...summarizeWebhookMessage(item, extractMessageTextFromWebhookItem),
            messageItem: prepareWebhookBodyForLog(item),
          },
        });
        continue;
      }

      const text = extractMessageTextFromWebhookItem(item);
      const remoteJid = extractSenderJid(item);
      const telefone = phoneFromWebhookItem(item);

      if (!isOutgoing && !text?.trim() && !telefone) continue;

      let { clique, trackingId, matchMethod } = await resolveCliqueFromMessage(supabase, {
        text: text || "",
        instanceName: instance,
        telefone,
      });

      if (!clique || !trackingId) {
        if (!isOutgoing) {
          const created = await createDirectWhatsAppLead(supabase, {
            telefone,
            instanceName: instance,
            text: text || "",
          });
          if (created) {
            clique = created.clique;
            trackingId = created.trackingId;
            matchMethod = created.matchMethod;
          }
        }
      }

      if (clique && trackingId && !isOutgoing && telefone) {
        const resolved = await resolveEffectiveLead(supabase, { clique, trackingId, telefone });
        clique = resolved.clique;
        trackingId = resolved.trackingId;
        if (resolved.merged) {
          matchMethod = "telefone_lead_existente";
        }
      }

      if (!clique || !trackingId) {
        if (isOutgoing) {
          await logLeadsEvent({
            supabase,
            tipo: "webhook",
            nivel: "aviso",
            mensagem: "Mensagem recebida — lead não identificado",
            instanceName: instance,
            detalhes: {
              preview: sanitizeForLog(text, 200),
              telefone: telefone || null,
              remoteJid: remoteJid || null,
              event,
              messageItem: prepareWebhookBodyForLog(item),
            },
          });
        }
        continue;
      }

      await persistLeadMensagem(supabase, {
        item,
        clique,
        trackingId,
        instanciaId: instanceCheck.instancia?.id,
        isOutgoing,
        text,
        instanceName: instance,
      });

      // Entrada do lead — conversão na primeira mensagem
      if (!isOutgoing) {
        if (clique.status === "aguardando") {
          const instanciaIdIn = resolveInstanciaId(clique);
          if (!instanciaIdIn) continue;

          const etapasIn = await getEtapasForInstancia(supabase, instanciaIdIn);
          const etapaPrimeiro = debugResolveEtapaFromMessage(etapasIn, text, {
            isFirstMessage: true,
            matchKeywords: false,
          });

          if (!etapaPrimeiro.etapa) {
            await logLeadsEvent({
              supabase,
              tipo: "webhook",
              nivel: "aviso",
              mensagem: "Primeira mensagem do lead — etapa 'primeiro contato' não configurada",
              instanceName: instance,
              cliqueId: trackingId,
              linkId: clique.link_id,
              detalhes: {
                origem: clique.link_id ? "link" : "sem_origem",
                matchMethod,
                motivo: etapaPrimeiro.motivo,
              },
            });
            continue;
          }

          const ok = await applyEtapaToClique(supabase, {
            clique,
            trackingId,
            etapa: etapaPrimeiro.etapa,
            telefone,
            text,
            link: clique.leads_links ?? null,
            instance,
            matchMethod: clique.link_id ? matchMethod : "whatsapp_direto",
            isFirstConversion: true,
          });
          if (ok) {
            processed += 1;
            await markMensagemDisparouEtapa(supabase, {
              cliqueId: trackingId,
              messageId: extractMessageIdFromWebhookItem(item),
              etapa: etapaPrimeiro.etapa,
            });
          }
        }
        continue;
      }

      if (!text?.trim() && !telefone) {
        await logLeadsEvent({
          supabase,
          tipo: "webhook",
          nivel: "aviso",
          mensagem: "Mensagem ignorada — sem texto e sem telefone extraível",
          instanceName: instance,
          detalhes: {
            remoteJid: remoteJid || null,
            key: prepareWebhookBodyForLog(item?.key ?? item?.data?.key ?? {}),
            messageItem: prepareWebhookBodyForLog(item),
          },
        });
        continue;
      }

      await logLeadsEvent({
        supabase,
        tipo: "webhook",
        nivel: "info",
        mensagem: "Lead identificado na mensagem",
        instanceName: instance,
        cliqueId: trackingId,
        linkId: clique.link_id,
        detalhes: {
          matchMethod,
          preview: sanitizeForLog(text, 200),
          telefone: telefone || null,
          statusLead: clique.status,
          etapaAtual: clique.etapa_id ?? null,
        },
      });

      const { data: cliqueFresh } = await supabase
        .from("leads_cliques")
        .select("*, leads_links(id, slug, nome, mensagem_inicial, instancia_id)")
        .eq("id", trackingId)
        .maybeSingle();

      const cliqueAtual = cliqueFresh ?? clique;
      const link = cliqueAtual.leads_links ?? null;
      const instanciaId = resolveInstanciaId(cliqueAtual);
      if (!instanciaId) {
        await logLeadsEvent({
          supabase,
          tipo: "webhook",
          nivel: "aviso",
          mensagem: "Lead sem instância no link — jornada ignorada",
          instanceName: instance,
          cliqueId: trackingId,
          linkId: cliqueAtual.link_id,
        });
        continue;
      }

      const etapas = await getEtapasForInstancia(supabase, instanciaId);

      // fromMe: true — somente palavras-chave mudam etapa
      const etapaKeywordDebug = debugResolveEtapaFromMessage(etapas, text, {
        isFirstMessage: false,
        matchKeywords: true,
      });
      const etapaKeyword = etapaKeywordDebug.etapa;

      if (!etapaKeyword) {
        await logLeadsEvent({
          supabase,
          tipo: "webhook",
          nivel: "info",
          mensagem: "Mensagem da instância — nenhuma palavra-chave correspondeu",
          instanceName: instance,
          cliqueId: trackingId,
          linkId: cliqueAtual.link_id,
          detalhes: {
            preview: sanitizeForLog(text, 200),
            textoNormalizado: etapaKeywordDebug.textoVisivel,
            etapaAtual: cliqueAtual.etapa_id,
            statusLead: cliqueAtual.status,
            motivo: etapaKeywordDebug.motivo,
            tentativasPalavras: etapaKeywordDebug.tentativas,
          },
        });
        continue;
      }

      if (etapaKeyword.id === cliqueAtual.etapa_id) {
        await logLeadsEvent({
          supabase,
          tipo: "webhook",
          nivel: "info",
          mensagem: `Lead já está na etapa "${etapaKeyword.nome}"`,
          instanceName: instance,
          cliqueId: trackingId,
          linkId: cliqueAtual.link_id,
        });
        continue;
      }

      const isFirstConversion = cliqueAtual.status === "aguardando";
      const ok = await applyEtapaToClique(supabase, {
        clique: cliqueAtual,
        trackingId,
        etapa: etapaKeyword,
        telefone,
        text,
        link,
        instance,
        matchMethod: "palavra_chave_instancia",
        isFirstConversion,
      });
      if (ok) {
        processed += 1;
        await markMensagemDisparouEtapa(supabase, {
          cliqueId: trackingId,
          messageId: extractMessageIdFromWebhookItem(item),
          etapa: etapaKeyword,
        });
      }
    }

    if (processed > 0) {
      await logLeadsEvent({
        supabase,
        tipo: "webhook",
        nivel: "sucesso",
        mensagem: `Webhook processado: ${processed} lead(s) atualizado(s)`,
        instanceName: instance,
        detalhes: { processed },
      });
    }

    return res.status(200).json({ ok: true, processed });
  } catch (err) {
    console.error("webhook-evolution:", err);
    await logLeadsEvent({
      supabase,
      tipo: "webhook",
      nivel: "erro",
      mensagem: `Erro no webhook: ${err?.message ?? "interno"}`,
      detalhes: { stack: err?.stack?.slice(0, 500) },
    });
    return res.status(500).json({ error: err?.message ?? "Erro interno." });
  }
}
