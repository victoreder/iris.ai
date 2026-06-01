import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { apiGet, apiPost } from "@/lib/api";
import { buildInstanceName, isValidInstanceName } from "@/lib/leadsUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadsInstanciaWhatsapp, StatusLeadsInstancia } from "@/types/database";
import type { Plano } from "@/types/usuario";

const statusLabels: Record<StatusLeadsInstancia, string> = {
  pendente: "Pendente",
  conectando: "Conectando",
  conectado: "Conectado",
  desconectado: "Desconectado",
};

const statusVariant: Record<StatusLeadsInstancia, "default" | "warning" | "success" | "destructive"> = {
  pendente: "default",
  conectando: "warning",
  conectado: "success",
  desconectado: "destructive",
};

type ConnectQrResponse = {
  qrcode?: string;
  qrCode?: string;
  base64?: string;
  shareUrl?: string;
};

type QrDialogData = {
  instanciaId: string;
  base64?: string;
  shareUrl?: string;
};

function extractQrBase64(data: ConnectQrResponse): string | undefined {
  const raw = data.qrcode ?? data.qrCode ?? data.base64;
  if (!raw || typeof raw !== "string") return undefined;
  return raw;
}

function qrImageSrc(base64: string): string {
  if (base64.startsWith("data:")) return base64;
  return `data:image/png;base64,${base64}`;
}

export function ChannelsPage() {
  const { contaAtiva, canDelete, isAdmin } = useConta();
  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState<QrDialogData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeadsInstanciaWhatsapp | null>(null);
  const [maxWhatsapps, setMaxWhatsapps] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const atLimit = maxWhatsapps != null && instancias.length >= maxWhatsapps;

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [instRes, planoRes] = await Promise.all([
      supabase
        .from("leads_instancias_whatsapp")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("created_at", { ascending: false }),
      contaAtiva.plano_id
        ? supabase.from("planos").select("max_whatsapps").eq("id", contaAtiva.plano_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    setInstancias((instRes.data as LeadsInstanciaWhatsapp[]) ?? []);
    const plano = planoRes.data as Pick<Plano, "max_whatsapps"> | null;
    setMaxWhatsapps(plano?.max_whatsapps ?? null);
    setLoading(false);
  }, [contaAtiva?.id, contaAtiva?.plano_id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startQrPoll = useCallback(
    (instanciaId: string) => {
      if (!contaAtiva) return;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await apiGet<{ telefone?: string }>(
            "/api/leads/status-instancia",
            { instanciaId },
            contaAtiva.id
          );
          if (status.telefone) {
            if (pollRef.current) clearInterval(pollRef.current);
            setQrOpen(false);
            setQrData(null);
            toast.success("WhatsApp conectado!");
            void load();
          }
        } catch {
          /* ignore poll errors */
        }
      }, 5000);
    },
    [contaAtiva, load]
  );

  const openQr = async (instanciaId: string) => {
    if (!contaAtiva) return;
    setQrOpen(true);
    setQrData({ instanciaId });
    setQrLoading(true);
    setBusy(`qr-${instanciaId}`);
    try {
      const data = await apiGet<ConnectQrResponse>(
        "/api/leads/conectar-instancia",
        { instanciaId },
        contaAtiva.id
      );
      const base64 = extractQrBase64(data);
      if (!base64) {
        toast.error("QR Code não retornado pela Evolution. Tente novamente.");
      }
      setQrData({
        instanciaId,
        base64,
        shareUrl: data.shareUrl,
      });
      startQrPoll(instanciaId);
    } catch (err) {
      setQrOpen(false);
      setQrData(null);
      toast.error(err instanceof Error ? err.message : "Erro ao obter QR.");
    } finally {
      setQrLoading(false);
      setBusy(null);
    }
  };

  const excluirInstancia = async () => {
    if (!contaAtiva || !canDelete || !deleteTarget) return;
    setBusy(`delete-${deleteTarget.id}`);
    try {
      await apiPost(
        "/api/leads/excluir-instancia",
        { instanciaId: deleteTarget.id },
        contaAtiva.id
      );
      toast.success("WhatsApp excluído.");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    } finally {
      setBusy(null);
    }
  };

  const criarInstancia = async () => {
    if (!contaAtiva || !canDelete) return;
    if (atLimit) {
      toast.error(
        `Limite do plano: máximo de ${maxWhatsapps} WhatsApp(s). Exclua uma instância ou faça upgrade.`
      );
      return;
    }
    if (!nome.trim()) {
      toast.error("Nome obrigatório.");
      return;
    }
    const instancePreview = buildInstanceName(nome);
    if (!isValidInstanceName(instancePreview)) {
      toast.error("Nome inválido — use pelo menos 2 letras ou números.");
      return;
    }
    setBusy("create");
    try {
      const res = await apiPost<{ instancia: { id: string } }>(
        "/api/leads/criar-instancia",
        { nome: nome.trim() },
        contaAtiva.id
      );
      toast.success("Instância criada. Escaneie o QR Code.");
      setCreateOpen(false);
      setNome("");
      await load();
      await openQr(res.instancia.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar.");
    } finally {
      setBusy(null);
    }
  };

  const refreshStatus = async (instanciaId: string) => {
    if (!contaAtiva) return;
    setBusy(`refresh-${instanciaId}`);
    try {
      await apiGet("/api/leads/status-instancia", { instanciaId }, contaAtiva.id);
      toast.success("Status atualizado.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setBusy(null);
    }
  };

  const closeQrDialog = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setQrOpen(false);
    setQrData(null);
    setQrLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Conectar WhatsApp via Evolution API</p>
          {maxWhatsapps != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              {instancias.length} de {maxWhatsapps} WhatsApp(s) do plano
            </p>
          )}
        </div>
        {isAdmin && (
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={busy === "create" || atLimit}
            title={atLimit ? "Limite do plano atingido" : undefined}
          >
            {busy === "create" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Nova instância
          </Button>
        )}
      </div>

      {atLimit && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Você atingiu o limite de {maxWhatsapps} WhatsApp(s) do seu plano. Exclua uma instância para
          criar outra ou solicite upgrade.
        </p>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instancias.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.nome}</TableCell>
                <TableCell>{i.telefone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[i.status]}>{statusLabels[i.status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy === `qr-${i.id}`}
                        onClick={() => void openQr(i.id)}
                        title="QR Code"
                      >
                        {busy === `qr-${i.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy === `refresh-${i.id}`}
                      onClick={() => void refreshStatus(i.id)}
                      title="Atualizar status"
                    >
                      {busy === `refresh-${i.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={busy === `delete-${i.id}`}
                        onClick={() => setDeleteTarget(i)}
                        title="Excluir WhatsApp"
                      >
                        {busy === `delete-${i.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {instancias.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Nenhuma instância. Crie uma para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DialogRoot open={Boolean(deleteTarget)} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent title="Excluir WhatsApp?">
          <p className="text-sm text-muted-foreground">
            A instância <strong>{deleteTarget?.nome}</strong> será removida do Viziom e da Evolution.
            Links de campanha vinculados a este número também serão excluídos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(deleteTarget && busy === `delete-${deleteTarget.id}`)}
              onClick={() => void excluirInstancia()}
            >
              {deleteTarget && busy === `delete-${deleteTarget.id}` ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo…
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Nova instância WhatsApp">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome exibido</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Atendimento principal"
                disabled={busy === "create"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy === "create"}>
              Cancelar
            </Button>
            <Button onClick={() => void criarInstancia()} disabled={busy === "create" || atLimit}>
              {busy === "create" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando…
                </>
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot
        open={qrOpen}
        onOpenChange={(v) => {
          if (!v) closeQrDialog();
        }}
      >
        <DialogContent title="Escaneie o QR Code">
          <div className="flex min-h-[280px] flex-col items-center justify-center py-4">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin" />
                <p className="text-sm">Gerando QR Code…</p>
              </div>
            ) : qrData?.base64 ? (
              <>
                <img
                  src={qrImageSrc(qrData.base64)}
                  alt="QR Code WhatsApp"
                  className="mx-auto max-w-xs rounded-lg border border-border"
                />
                {qrData.shareUrl && (
                  <div className="mt-6 w-full max-w-sm space-y-2 px-2 text-center text-sm text-muted-foreground">
                    <p>
                      Caso precise compartilhar esse QR Code, não tire print, envie este link:
                    </p>
                    <a
                      href={qrData.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-primary hover:underline"
                    >
                      {qrData.shareUrl}
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        void navigator.clipboard.writeText(qrData.shareUrl!);
                        toast.success("Link copiado!");
                      }}
                    >
                      Copiar link
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Não foi possível carregar o QR Code. Feche e tente novamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeQrDialog}
              disabled={qrLoading || busy === `refresh-${qrData?.instanciaId}`}
            >
              Fechar
            </Button>
            <Button
              disabled={qrLoading || !qrData?.instanciaId || busy === `refresh-${qrData?.instanciaId}`}
              onClick={() => qrData && void refreshStatus(qrData.instanciaId)}
            >
              {busy === `refresh-${qrData?.instanciaId}` ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                "Já escaneei — verificar conexão"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
