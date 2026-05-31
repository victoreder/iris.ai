import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Filter } from "lucide-react";
import { toast } from "sonner";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { apiPost } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  getOriginLabel,
  isMetaOrigin,
  formatPhoneBR,
  stripInvisibleChars,
} from "@/lib/leadsAnalytics";
import { describeLeadEvento, LEAD_EVENTO_LABELS } from "@/lib/leadEventos";
import { LEAD_DETAIL_TABS, type LeadDetailTab } from "@/lib/leadDetailTabs";
import { getMetaEventoLabel } from "@/lib/leadsMetaEvents";
import { useConta } from "@/contexts/ContaContext";
import { cn } from "@/lib/utils";
import type {
  LeadsClique,
  LeadsCliqueEvento,
  LeadsCliqueMensagem,
  LeadsJornadaEtapa,
} from "@/types/database";

interface Props {
  lead: LeadsClique | null;
  etapas: LeadsJornadaEtapa[];
  open: boolean;
  initialTab?: LeadDetailTab;
  onTabChange?: (tab: LeadDetailTab) => void;
  onClose: () => void;
  onUpdated: () => void;
}

const statusLabels = {
  convertido: "Convertido",
  expirado: "Expirado",
  aguardando: "Aguardando",
};

const eventoBadgeVariant = {
  lead_novo: "success" as const,
  etapa_alterada: "default" as const,
  meta_enviado: "meta" as const,
};

function MensagemMediaContent({ msg }: { msg: LeadsCliqueMensagem }) {
  if (!msg.media_url) return null;

  const mime = msg.media_mime ?? "";
  const isImage = msg.tipo === "imagem" || msg.tipo === "sticker" || mime.startsWith("image/");
  const isAudio = msg.tipo === "audio" || mime.startsWith("audio/");
  const isVideo = msg.tipo === "video" || mime.startsWith("video/");

  if (isImage) {
    return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={msg.media_url}
          alt={msg.media_nome ?? "Imagem"}
          className="mt-1 max-h-48 rounded-md object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (isAudio) {
    return (
      <audio controls preload="none" className="mt-2 max-w-full">
        <source src={msg.media_url} type={mime || undefined} />
      </audio>
    );
  }

  if (isVideo) {
    return (
      <video controls preload="metadata" className="mt-2 max-h-48 max-w-full rounded-md">
        <source src={msg.media_url} type={mime || undefined} />
      </video>
    );
  }

  return (
    <a
      href={msg.media_url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex text-sm underline underline-offset-2"
    >
      {msg.media_nome ?? "Baixar arquivo"}
    </a>
  );
}

function MensagemBubble({ msg }: { msg: LeadsCliqueMensagem }) {
  const hasMedia = Boolean(msg.media_url);
  const showText =
    msg.texto &&
    !(hasMedia && /^\[(Imagem|Vídeo|Áudio|Documento|Figurinha)\]$/.test(msg.texto.trim()));

  const etapaLabel = msg.etapa_nome ? ` — ${msg.etapa_nome}` : "";

  return (
    <div className={cn("flex", msg.from_me ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 shadow-sm",
          msg.from_me
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground"
        )}
      >
        <MensagemMediaContent msg={msg} />
        {showText && <p className="whitespace-pre-wrap break-words text-sm">{msg.texto}</p>}
        {!showText && !hasMedia && <p className="text-sm">{msg.texto ?? "—"}</p>}
        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-1.5 text-[10px]",
            msg.from_me ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          {msg.disparou_etapa && (
            <span
              className="inline-flex items-center gap-0.5 rounded bg-black/10 px-1 py-0.5"
              title={`Etapa alterada${etapaLabel}`}
            >
              <Filter className="h-3 w-3 shrink-0" aria-hidden />
              <span className="sr-only">Etapa alterada{etapaLabel}</span>
            </span>
          )}
          {msg.etapa_representa_venda && (
            <span
              className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1 py-0.5 text-emerald-700 dark:text-emerald-300"
              title={`Venda${etapaLabel}`}
            >
              <DollarSign className="h-3 w-3 shrink-0" aria-hidden />
              <span className="sr-only">Venda{etapaLabel}</span>
            </span>
          )}
          <span>
            {format(new Date(msg.mensagem_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            {" · "}
            {msg.from_me ? "Enviada" : "Recebida"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function LeadDetailDialog({
  lead,
  etapas,
  open,
  initialTab = "geral",
  onTabChange,
  onClose,
  onUpdated,
}: Props) {
  const { contaAtiva, canWrite } = useConta();
  const [tab, setTab] = useState<LeadDetailTab>("geral");
  const [etapaId, setEtapaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<LeadsCliqueEvento[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [mensagens, setMensagens] = useState<LeadsCliqueMensagem[]>([]);
  const [loadingMensagens, setLoadingMensagens] = useState(false);
  const conversaEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lead) setEtapaId(lead.etapa_id ?? "");
  }, [lead]);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, lead?.id]);

  useEffect(() => {
    if (!lead || !open) {
      setHistorico([]);
      return;
    }
    setLoadingHistorico(true);
    void supabase
      .from("leads_cliques_eventos")
      .select("*")
      .eq("clique_id", lead.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setHistorico((data as LeadsCliqueEvento[]) ?? []);
        setLoadingHistorico(false);
      });
  }, [lead, open]);

  useEffect(() => {
    if (!lead || !open) {
      setMensagens([]);
      return;
    }
    setLoadingMensagens(true);
    void supabase
      .from("leads_cliques_mensagens")
      .select("*")
      .eq("clique_id", lead.id)
      .order("mensagem_em", { ascending: true })
      .then(({ data }) => {
        setMensagens((data as LeadsCliqueMensagem[]) ?? []);
        setLoadingMensagens(false);
      });
  }, [lead, open]);

  const mensagensExibidas = useMemo(() => {
    if (mensagens.length > 0) return mensagens;
    if (!lead?.mensagem_recebida?.trim()) return [];

    const legado: LeadsCliqueMensagem = {
      id: "legado-primeira-mensagem",
      conta_id: lead.conta_id,
      clique_id: lead.id,
      instancia_id: lead.instancia_id,
      from_me: false,
      texto: stripInvisibleChars(lead.mensagem_recebida),
      tipo: "texto",
      message_id: null,
      remote_jid: null,
      media_url: null,
      media_mime: null,
      media_nome: null,
      disparou_etapa: false,
      etapa_nome: null,
      etapa_representa_venda: false,
      mensagem_em: lead.convertido_at ?? lead.created_at,
      created_at: lead.convertido_at ?? lead.created_at,
    };
    return [legado];
  }, [mensagens, lead]);

  useEffect(() => {
    if (tab !== "conversa" || !open) return;
    conversaEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tab, open, mensagensExibidas.length]);

  if (!lead || !contaAtiva) return null;

  const instanciaId = lead.instancia_id ?? lead.leads_links?.instancia_id;
  const etapasInstancia = etapas.filter((e) => e.instancia_id === instanciaId);
  const dispositivo = [lead.device_type, lead.browser, lead.os].filter(Boolean).join(" · ") || "—";

  const handleSaveEtapa = async () => {
    if (!etapaId || !canWrite) return;
    setSaving(true);
    try {
      const result = await apiPost<{
        meta?: { ok?: boolean; error?: string };
      }>("/api/leads/atualizar-etapa-lead", { cliqueId: lead.id, etapaId }, contaAtiva.id);

      if (result.meta?.ok) toast.success("Etapa salva e Meta enviada.");
      else if (result.meta?.error) toast.warning(`Etapa salva. Meta: ${result.meta.error}`);
      else toast.success("Etapa atualizada.");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Detalhes do lead" className="max-w-xl">
        <div className="mb-4 flex gap-1 border-b border-border">
          {LEAD_DETAIL_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                onTabChange?.(key);
              }}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors -mb-px",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "geral" ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{formatPhoneBR(lead.telefone_lead)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={lead.status === "convertido" ? "success" : "warning"}>
                  {statusLabels[lead.status]}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Campanha</p>
                <p className="font-medium">{lead.leads_links?.nome ?? "WhatsApp direto"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Origem</p>
                <div className="flex items-center gap-2">
                  {isMetaOrigin(lead) && <MetaOriginBadge />}
                  <span>{getOriginLabel(lead)}</span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Dispositivo</p>
                <p className="font-medium">{dispositivo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clique no link</p>
                <p className="font-medium">
                  {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Entrada como lead</p>
                <p className="font-medium">
                  {lead.convertido_at
                    ? format(new Date(lead.convertido_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Etapa atual</p>
                <p className="font-medium">{lead.leads_jornada_etapas?.nome ?? "—"}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium text-muted-foreground">UTMs / atribuição</p>
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-xs">
                <span>Source: {lead.utm_source ?? "—"}</span>
                <span>Medium: {lead.utm_medium ?? "—"}</span>
                <span>Campaign: {lead.utm_campaign ?? "—"}</span>
                <span>Content: {lead.utm_content ?? "—"}</span>
                <span>Term: {lead.utm_term ?? "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>fbclid: {lead.fbclid ?? "—"}</span>
              <span>gclid: {lead.gclid ?? "—"}</span>
              <span>IP: {lead.ip_address ?? "—"}</span>
              <span>fbp: {lead.fbp ?? "—"}</span>
              <span>fbc: {lead.fbc ?? "—"}</span>
            </div>

            {lead.referrer && (
              <p className="truncate text-xs text-muted-foreground">Referrer: {lead.referrer}</p>
            )}
            {lead.landing_url && (
              <p className="truncate text-xs text-muted-foreground">Landing: {lead.landing_url}</p>
            )}
          </div>
        ) : tab === "jornada" ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground">Etapa atual</p>
              <p className="mt-1 text-base font-medium">
                {lead.leads_jornada_etapas?.nome ?? "Sem etapa"}
              </p>
            </div>

            {instanciaId && etapasInstancia.length > 0 && canWrite && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label>Alterar etapa</Label>
                <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {etapasInstancia.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </Select>
                <Button size="sm" onClick={handleSaveEtapa} disabled={!etapaId || saving}>
                  {saving ? "Salvando…" : "Salvar etapa e enviar Meta"}
                </Button>
              </div>
            )}

            <div>
              <p className="mb-2 font-medium">Histórico</p>
              {loadingHistorico ? (
                <p className="text-xs text-muted-foreground">Carregando…</p>
              ) : historico.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum evento registrado ainda.</p>
              ) : (
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {historico.map((evento) => (
                    <li key={evento.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={eventoBadgeVariant[evento.tipo]}>
                          {LEAD_EVENTO_LABELS[evento.tipo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(evento.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{describeLeadEvento(evento)}</p>
                      {evento.tipo === "meta_enviado" && evento.evento_meta && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Evento: {getMetaEventoLabel(evento.evento_meta)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lead.meta_erro && (
              <p className="text-xs text-destructive">Erro Meta: {lead.meta_erro}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Mensagens enviadas e recebidas via WhatsApp deste lead.
            </p>
            {loadingMensagens ? (
              <p className="text-xs text-muted-foreground">Carregando conversa…</p>
            ) : mensagensExibidas.length === 0 ? (
              <p className="rounded-md border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                Nenhuma mensagem registrada ainda.
              </p>
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
                {mensagensExibidas.map((msg) => (
                  <MensagemBubble key={msg.id} msg={msg} />
                ))}
                <div ref={conversaEndRef} />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
