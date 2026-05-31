import { useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Filter } from "lucide-react";
import { buildChatTimeline, buildMensagensExibidas } from "@/lib/leadMensagensChat";
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
      <audio controls preload="none" className="mt-1 max-w-[240px]">
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
      className="mt-1 inline-flex text-sm font-medium underline underline-offset-2"
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
    <div className={cn("flex px-3", msg.from_me ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[min(85%,420px)] rounded-lg px-2.5 pb-1.5 pt-1.5 shadow-sm",
          msg.from_me
            ? "rounded-tr-none bg-[#d9fdd3] text-[#111b21] dark:bg-emerald-900/40 dark:text-emerald-50"
            : "rounded-tl-none border border-border/60 bg-card text-foreground"
        )}
      >
        <MensagemMediaContent msg={msg} />
        {showText && (
          <p className="whitespace-pre-wrap break-words px-0.5 text-[14.5px] leading-snug">{msg.texto}</p>
        )}
        {!showText && !hasMedia && (
          <p className="whitespace-pre-wrap break-words px-0.5 text-[14.5px] leading-snug">{msg.texto ?? "—"}</p>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1 px-0.5">
          {msg.disparou_etapa && (
            <span title={`Etapa alterada${etapaLabel}`} className="text-[#667781] dark:text-muted-foreground">
              <Filter className="h-3 w-3" aria-hidden />
            </span>
          )}
          {msg.etapa_representa_venda && (
            <span title={`Venda${etapaLabel}`} className="text-emerald-700 dark:text-emerald-400">
              <DollarSign className="h-3 w-3" aria-hidden />
            </span>
          )}
          <span className="text-[11px] tabular-nums text-[#667781] dark:text-muted-foreground">{hora}</span>
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-lg bg-[#ffffffcc] px-3 py-1 text-[12px] font-medium uppercase tracking-wide text-[#54656f] shadow-sm backdrop-blur-sm dark:bg-card/90 dark:text-muted-foreground">
        {label}
      </span>
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
      <div className="flex flex-1 items-center justify-center bg-[#efeae2] dark:bg-muted/30">
        <p className="text-sm text-muted-foreground">Carregando conversa…</p>
      </div>
    );
  }

  if (mensagensExibidas.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#efeae2] px-6 dark:bg-muted/30">
        <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          As mensagens enviadas e recebidas via WhatsApp aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-[#efeae2] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNkMGRiZDUiLz48L3N2Zz4=')] py-2 dark:bg-muted/20"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-1 pb-4">
        {timeline.map((item) =>
          item.type === "date" ? (
            <DateSeparator key={item.key} label={item.label} />
          ) : (
            <ChatBubble key={item.key} msg={item.msg} />
          )
        )}
        <div ref={endRef} className="h-1" />
      </div>
    </div>
  );
}
