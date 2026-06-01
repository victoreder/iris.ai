import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Filter, MessageCircle, User } from "lucide-react";
import { buildChatTimeline, buildMensagensExibidas } from "@/lib/leadMensagensChat";
import {
  extractPhoneDigits,
  formatPhoneBR,
  normalizeBrazilPhoneNational,
} from "@/lib/leadsAnalytics";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeadsClique, LeadsCliqueMensagem } from "@/types/database";

function MensagemMediaContent({ msg }: { msg: LeadsCliqueMensagem }) {
  if (!msg.media_url) return null;

  const mime = msg.media_mime ?? "";
  const isImage = msg.tipo === "imagem" || msg.tipo === "sticker" || mime.startsWith("image/");
  const isAudio = msg.tipo === "audio" || mime.startsWith("audio/");
  const isVideo = msg.tipo === "video" || mime.startsWith("video/");

  if (isImage) {
    return (
      <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md">
        <img
          src={msg.media_url}
          alt={msg.media_nome ?? "Imagem"}
          className="max-h-64 w-full object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (isAudio) {
    return (
      <audio controls preload="none" className="mt-1 max-w-[280px]">
        <source src={msg.media_url} type={mime || undefined} />
      </audio>
    );
  }

  if (isVideo) {
    return (
      <video controls preload="metadata" className="mt-1 max-h-64 max-w-full rounded-md">
        <source src={msg.media_url} type={mime || undefined} />
      </video>
    );
  }

  return (
    <a
      href={msg.media_url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex text-sm font-medium text-primary underline underline-offset-2"
    >
      {msg.media_nome ?? "Baixar arquivo"}
    </a>
  );
}

function ChatBubble({ msg }: { msg: LeadsCliqueMensagem }) {
  const hasMedia = Boolean(msg.media_url);
  const showText =
    msg.texto &&
    !(hasMedia && /^\[(Imagem|Vídeo|Áudio|Documento|Figurinha)\]$/.test(msg.texto.trim()));
  const etapaLabel = msg.etapa_nome ? ` — ${msg.etapa_nome}` : "";
  const hora = format(new Date(msg.mensagem_em), "HH:mm", { locale: ptBR });

  return (
    <div className={cn("flex gap-2 px-1", msg.from_me ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          msg.from_me ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        )}
        aria-hidden
      >
        <User className="h-3.5 w-3.5" />
      </div>

      <div className={cn("flex max-w-[min(85%,520px)] flex-col gap-0.5", msg.from_me ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 shadow-sm",
            msg.from_me
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-card text-foreground"
          )}
        >
          <MensagemMediaContent msg={msg} />
          {showText && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.texto}</p>
          )}
          {!showText && !hasMedia && (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{msg.texto ?? "—"}</p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 px-1 text-[10px] tabular-nums text-muted-foreground",
            msg.from_me ? "flex-row-reverse" : "flex-row"
          )}
        >
          {msg.disparou_etapa && (
            <span title={`Etapa alterada${etapaLabel}`}>
              <Filter className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}
          {msg.etapa_representa_venda && (
            <span title={`Venda${etapaLabel}`} className="text-success">
              <DollarSign className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}
          <span>{hora}</span>
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-3">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function ConversaShell({
  lead,
  totalMensagens,
  children,
  scrollRef,
  empty,
  loading,
}: {
  lead: LeadsClique;
  totalMensagens: number;
  children: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  empty?: boolean;
  loading?: boolean;
}) {
  const national = normalizeBrazilPhoneNational(extractPhoneDigits(lead.telefone_lead));
  const initials = national.slice(-2) || "?";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex shrink-0 items-center gap-4 border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{formatPhoneBR(lead.telefone_lead)}</p>
            <p className="truncate text-sm text-muted-foreground">
              {lead.leads_links?.nome ?? "WhatsApp direto"}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 gap-1.5 font-normal">
            <MessageCircle className="h-3.5 w-3.5" />
            {loading ? "…" : totalMensagens} {totalMensagens === 1 ? "mensagem" : "mensagens"}
          </Badge>
        </div>

        <div
          ref={scrollRef}
          className={cn(
            "lead-panel-bg min-h-0 flex-1 overflow-y-auto",
            empty || loading ? "flex flex-col items-center justify-center px-6 py-16 text-center" : "px-4 py-5 sm:px-6"
          )}
        >
          {children}
        </div>

        <div className="shrink-0 border-t border-border bg-muted/20 px-5 py-2.5 text-center text-xs text-muted-foreground">
          Histórico sincronizado via WhatsApp · somente leitura
        </div>
      </div>
    </div>
  );
}

interface Props {
  lead: LeadsClique;
  mensagens: LeadsCliqueMensagem[];
  loading: boolean;
  active: boolean;
}

export function LeadConversaChat({ lead, mensagens, loading, active }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const mensagensExibidas = useMemo(
    () => buildMensagensExibidas(mensagens, lead),
    [mensagens, lead]
  );

  const timeline = useMemo(() => buildChatTimeline(mensagensExibidas), [mensagensExibidas]);

  useEffect(() => {
    if (!active || loading) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active, loading, timeline.length]);

  if (loading) {
    return (
      <ConversaShell lead={lead} totalMensagens={0} loading>
        <p className="text-sm text-muted-foreground">Carregando conversa…</p>
      </ConversaShell>
    );
  }

  if (mensagensExibidas.length === 0) {
    return (
      <ConversaShell lead={lead} totalMensagens={0} empty>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-4 text-base font-medium">Nenhuma mensagem ainda</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          As mensagens enviadas e recebidas via WhatsApp aparecerão aqui assim que forem registradas.
        </p>
      </ConversaShell>
    );
  }

  return (
    <ConversaShell lead={lead} totalMensagens={mensagensExibidas.length} scrollRef={scrollRef}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {timeline.map((item) =>
          item.type === "date" ? (
            <DateSeparator key={item.key} label={item.label} />
          ) : (
            <ChatBubble key={item.key} msg={item.msg} />
          )
        )}
        <div ref={endRef} className="h-1" />
      </div>
    </ConversaShell>
  );
}
