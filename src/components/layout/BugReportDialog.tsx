import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  FileIcon,
  ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Video,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { capturePageScreenshot } from "@/lib/captureScreenshot";
import { getPageTitle } from "@/lib/appNavigation";
import { submitFeedback } from "@/lib/submitFeedback";
import type { FeedbackContexto, FeedbackTipo, FeedbackUrgencia } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Anexo {
  id: string;
  file: File;
  preview?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const TIPO_LABEL: Record<FeedbackTipo, string> = {
  bug: "Bug / erro",
  melhoria: "Melhoria",
  sugestao: "Sugestão de funcionalidade",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildContexto(
  pathname: string,
  contaNome: string,
  usuarioNome: string,
  email: string,
  papel: string | null
): Omit<FeedbackContexto, "erros"> {
  return {
    pagina: getPageTitle(pathname),
    rota: pathname,
    conta: contaNome,
    usuario: usuarioNome,
    email,
    papel,
    dataHora: new Date().toISOString(),
    navegador: navigator.userAgent,
    resolucao: `${window.innerWidth}×${window.innerHeight}`,
    urlCompleta: window.location.href,
  };
}

function FileIconFor({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (type.startsWith("video/")) return <Video className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenshotBlob: Blob | null;
  screenshotPreviewUrl: string | null;
}

export function BugReportDialog({
  open,
  onOpenChange,
  screenshotBlob,
  screenshotPreviewUrl,
}: BugReportDialogProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { usuario } = useUsuario();
  const { contaAtiva, papelAtivo } = useConta();

  const [tipo, setTipo] = useState<FeedbackTipo>("bug");
  const [urgencia, setUrgencia] = useState<FeedbackUrgencia>("normal");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [contextoAberto, setContextoAberto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const contexto = useMemo(
    () =>
      buildContexto(
        location.pathname,
        contaAtiva?.nome ?? "—",
        usuario?.nome ?? user?.email ?? "—",
        usuario?.email ?? user?.email ?? "—",
        papelAtivo
      ),
    [location.pathname, contaAtiva?.nome, usuario, user, papelAtivo]
  );

  const resetForm = useCallback(() => {
    setTipo("bug");
    setUrgencia("normal");
    setTitulo("");
    setDescricao("");
    setAnexos((prev) => {
      prev.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
      return [];
    });
    setContextoAberto(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, resetForm]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const novos: Anexo[] = [];

    for (const file of Array.from(files)) {
      if (anexos.length + novos.length >= MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} anexos.`);
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" excede 5 MB.`);
        continue;
      }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      novos.push({ id: crypto.randomUUID(), file, preview });
    }

    if (novos.length) setAnexos((prev) => [...prev, ...novos]);
  };

  const removeAnexo = (id: string) => {
    setAnexos((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!titulo.trim()) {
      toast.error("Informe um título.");
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        userId: user.id,
        contaId: contaAtiva?.id ?? null,
        tipo,
        urgencia,
        titulo,
        descricao,
        contexto,
        screenshot: screenshotBlob,
        anexos: anexos.map((a) => a.file),
      });
      toast.success("Registro enviado! Obrigado pelo feedback.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar registro.");
    } finally {
      setSubmitting(false);
    }
  };

  const contextoDisplay = [
    ["Página", contexto.pagina],
    ["Rota", contexto.rota],
    ["Conta", contexto.conta],
    ["Usuário", contexto.usuario],
    ["E-mail", contexto.email],
    ["Papel", contexto.papel ?? "—"],
    ["Data/hora", new Date(contexto.dataHora).toLocaleString("pt-BR")],
    ["Resolução", contexto.resolucao],
  ] as const;

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Registrar bug ou sugestão"
        description="O contexto da página foi capturado automaticamente para facilitar a depuração."
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-medium"
              onClick={() => setContextoAberto((v) => !v)}
            >
              <span className="flex items-center gap-2 text-success">
                <span className="h-2 w-2 rounded-full bg-success" />
                Contexto capturado automaticamente
              </span>
              {contextoAberto ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
              {screenshotPreviewUrl ? (
                <img
                  src={screenshotPreviewUrl}
                  alt="Captura da tela"
                  className="max-h-40 w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-muted text-xs text-muted-foreground">
                  Captura de tela indisponível
                </div>
              )}
            </div>

            {contextoAberto && (
              <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                {contextoDisplay.map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-20 shrink-0 font-medium text-foreground">{k}</dt>
                    <dd className="truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as FeedbackTipo)}>
                {(Object.entries(TIPO_LABEL) as [FeedbackTipo, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgência</Label>
              <Select value={urgencia} onChange={(e) => setUrgencia(e.target.value as FeedbackUrgencia)}>
                <option value="normal">Normal</option>
                <option value="urgente">Urgente</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-titulo">Título</Label>
            <Input
              id="bug-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Resuma o problema ou sugestão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bug-descricao">Descrição</Label>
            <Textarea
              id="bug-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que aconteceu, o que esperava e passos para reproduzir"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Prints e anexos</Label>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50",
                anexos.length >= MAX_FILES && "pointer-events-none opacity-50"
              )}
            >
              <Paperclip className="h-5 w-5" />
              <span>Clique para adicionar imagens, vídeos ou arquivos</span>
              <span className="text-xs">Máx. 5 MB por arquivo · até {MAX_FILES} anexos</span>
              <input
                type="file"
                className="sr-only"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                disabled={anexos.length >= MAX_FILES}
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {anexos.length > 0 && (
              <ul className="space-y-2">
                {anexos.map((anexo) => (
                  <li
                    key={anexo.id}
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                  >
                    {anexo.preview ? (
                      <img src={anexo.preview} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <FileIconFor type={anexo.file.type} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{anexo.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(anexo.file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAnexo(anexo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Enviar registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}

interface BugReportButtonProps {
  compact?: boolean;
}

export function BugReportButton({ compact }: BugReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshotBlob, setScreenshotBlob] = useState<Blob | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);

  const cleanupScreenshot = useCallback(() => {
    if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    setScreenshotPreviewUrl(null);
    setScreenshotBlob(null);
  }, [screenshotPreviewUrl]);

  const handleOpen = async () => {
    setCapturing(true);
    try {
      const blob = await capturePageScreenshot();
      setScreenshotBlob(blob);
      if (blob) setScreenshotPreviewUrl(URL.createObjectURL(blob));
      setOpen(true);
    } catch {
      toast.error("Não foi possível capturar a tela, mas você pode enviar o registro.");
      setOpen(true);
    } finally {
      setCapturing(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) cleanupScreenshot();
  };

  return (
    <>
      <Button
        variant="outline"
        size={compact ? "icon" : "sm"}
        onClick={() => void handleOpen()}
        disabled={capturing}
        title="Registrar bug"
        aria-label="Registrar bug"
        className={compact ? undefined : "gap-2"}
      >
        {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
        {!compact && <span className="hidden sm:inline">{capturing ? "Capturando…" : "Bug"}</span>}
      </Button>
      <BugReportDialog
        open={open}
        onOpenChange={handleOpenChange}
        screenshotBlob={screenshotBlob}
        screenshotPreviewUrl={screenshotPreviewUrl}
      />
    </>
  );
}
