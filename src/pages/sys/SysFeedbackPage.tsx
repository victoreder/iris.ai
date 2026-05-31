import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, FileIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getFeedbackSignedUrl } from "@/lib/storageUrls";
import type { Feedback, FeedbackAnexo, FeedbackContexto, FeedbackStatus } from "@/types/usuario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";

type FeedbackRow = Feedback & {
  usuarios: { email: string; nome: string | null } | null;
  contas: { nome: string } | null;
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const TIPO_LABEL = { bug: "Bug", sugestao: "Sugestão", melhoria: "Melhoria" };
const URGENCIA_LABEL = { normal: "Normal", urgente: "Urgente" };

function FeedbackAnexoLink({ anexo }: { anexo: FeedbackAnexo }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void getFeedbackSignedUrl(anexo.path).then(setUrl);
  }, [anexo.path]);

  if (!url) return <span className="text-sm text-muted-foreground">{anexo.nome}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <FileIcon className="h-3.5 w-3.5" />
      {anexo.nome}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function FeedbackScreenshot({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    void getFeedbackSignedUrl(path).then(setUrl);
  }, [path]);

  if (!url) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <img src={url} alt="Screenshot" className="max-h-64 w-full object-cover object-top" />
    </div>
  );
}

function ContextoDetalhes({ contexto }: { contexto: FeedbackContexto }) {
  const items = [
    ["Página", contexto.pagina],
    ["Rota", contexto.rota],
    ["Conta", contexto.conta],
    ["Usuário", contexto.usuario],
    ["E-mail", contexto.email],
    ["Papel", contexto.papel ?? "—"],
    ["Data/hora", new Date(contexto.dataHora).toLocaleString("pt-BR")],
    ["Resolução", contexto.resolucao],
    ["URL", contexto.urlCompleta],
  ] as const;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
      <p className="font-medium">Contexto capturado</p>
      <dl className="grid gap-1.5 text-xs">
        {items.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5rem_1fr] gap-2">
            <dt className="font-medium text-muted-foreground">{k}</dt>
            <dd className="break-all">{v}</dd>
          </div>
        ))}
      </dl>
      {contexto.erros && contexto.erros.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Erros recentes no console</p>
          <ul className="space-y-1 text-xs text-destructive">
            {contexto.erros.map((erro, i) => (
              <li key={i} className="rounded bg-destructive/5 px-2 py-1">
                {erro.mensagem}
                {erro.origem && <span className="text-muted-foreground"> · {erro.origem}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SysFeedbackPage() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [status, setStatus] = useState<FeedbackStatus>("aberto");
  const [resposta, setResposta] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*, usuarios!usuario_id(email, nome), contas(nome)")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openItem = (item: FeedbackRow) => {
    setSelected(item);
    setStatus(item.status);
    setResposta(item.resposta ?? "");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("feedback")
        .update({ status, resposta: resposta.trim() || null })
        .eq("id", selected.id);
      if (error) throw error;
      toast.success("Feedback atualizado.");
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bugs e sugestões</h1>
        <p className="text-muted-foreground">Relatos enviados pelos usuários do Viziom.</p>
      </div>

      <DialogRoot open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent title={selected?.titulo ?? "Feedback"} className="max-w-2xl">
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{TIPO_LABEL[selected.tipo]}</Badge>
                <Badge variant={selected.urgencia === "urgente" ? "destructive" : "default"}>
                  {URGENCIA_LABEL[selected.urgencia ?? "normal"]}
                </Badge>
                <Badge variant="default">{STATUS_LABEL[selected.status]}</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  {selected.usuarios?.email} · {selected.contas?.nome ?? "—"} ·{" "}
                  {new Date(selected.created_at).toLocaleString("pt-BR")}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-foreground">{selected.descricao || "—"}</p>
              </div>

              {selected.screenshot_path && <FeedbackScreenshot path={selected.screenshot_path} />}

              {selected.contexto && <ContextoDetalhes contexto={selected.contexto} />}

              {selected.anexos?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Anexos</p>
                  <ul className="space-y-1">
                    {selected.anexos.map((anexo) => (
                      <li key={anexo.path}>
                        <FeedbackAnexoLink anexo={anexo} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
                >
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resposta / correção</Label>
                <Textarea
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  rows={4}
                  placeholder="Descreva a correção ou resposta ao usuário…"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Fechar
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </DialogRoot>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openItem(item)}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{TIPO_LABEL[item.tipo]}</TableCell>
                    <TableCell>
                      <Badge variant={item.urgencia === "urgente" ? "destructive" : "default"}>
                        {URGENCIA_LABEL[item.urgencia ?? "normal"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.titulo}</TableCell>
                    <TableCell>{item.contas?.nome ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "resolvido"
                            ? "success"
                            : item.status === "aberto"
                              ? "warning"
                              : "default"
                        }
                      >
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
