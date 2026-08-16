import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, Info, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import { getLeadMetaAdsUrl, getLeadPublicUrl } from "@/lib/leadsUrl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeadsInstanciaWhatsapp, LeadsLink } from "@/types/database";
import { LEADS_INSTANCIA_COLUNAS } from "@/types/database";

interface LinkForm {
  nome: string;
  instanciaId: string;
  mensagemInicial: string;
  ativo: boolean;
}

const emptyForm: LinkForm = {
  nome: "",
  instanciaId: "",
  mensagemInicial: "",
  ativo: true,
};

export function LinksRastreaveisPage() {
  const { contaAtiva, canWrite, canDelete } = useConta();
  const [links, setLinks] = useState<LeadsLink[]>([]);
  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [infoLink, setInfoLink] = useState<LeadsLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LeadsLink | null>(null);
  const [form, setForm] = useState<LinkForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const instanciaPorId = useMemo(
    () => new Map(instancias.map((i) => [i.id, i])),
    [instancias]
  );

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [lRes, iRes] = await Promise.all([
      supabase
        .from("leads_links")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("leads_instancias_whatsapp")
        .select(LEADS_INSTANCIA_COLUNAS)
        .eq("conta_id", contaAtiva.id)
        .order("nome"),
    ]);
    setLinks((lRes.data as LeadsLink[]) ?? []);
    setInstancias((iRes.data as LeadsInstanciaWhatsapp[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, instanciaId: instancias[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (link: LeadsLink) => {
    setEditing(link);
    setForm({
      nome: link.nome,
      instanciaId: link.instancia_id,
      mensagemInicial: link.mensagem_inicial,
      ativo: link.ativo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!contaAtiva || !canWrite) return;
    if (!form.nome.trim() || !form.mensagemInicial.trim() || !form.instanciaId) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPost(
          "/api/leads/atualizar-link",
          {
            linkId: editing.id,
            nome: form.nome.trim(),
            instanciaId: form.instanciaId,
            mensagemInicial: form.mensagemInicial.trim(),
            ativo: form.ativo,
          },
          contaAtiva.id
        );
        toast.success("Link rastreável atualizado.");
      } else {
        await apiPost(
          "/api/leads/criar-link",
          {
            nome: form.nome.trim(),
            instanciaId: form.instanciaId,
            mensagemInicial: form.mensagemInicial.trim(),
          },
          contaAtiva.id
        );
        toast.success("Link rastreável criado.");
      }
      setDialogOpen(false);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contaAtiva || !deleteId || !canDelete) return;
    try {
      await apiPost("/api/leads/excluir-link", { linkId: deleteId }, contaAtiva.id);
      toast.success("Link rastreável excluído.");
      setDeleteId(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  const copyText = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {canWrite && (
          <Button
            data-tour="link-rastreavel-create"
            onClick={openCreate}
            disabled={instancias.length === 0}
          >
            <Plus className="h-4 w-4" /> Novo link rastreável
          </Button>
        )}
      </div>

      {instancias.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Conecte um WhatsApp em WhatsApps antes de criar links rastreáveis.
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.map((l) => {
              const instancia = instanciaPorId.get(l.instancia_id);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {instancia?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.ativo ? "success" : "default"}>
                      {l.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(l.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="Opções">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setInfoLink(l)}>
                          <Info className="h-4 w-4" />
                          Informações
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyText(getLeadPublicUrl(l.slug), "Link para site")}>
                          <Copy className="h-4 w-4" />
                          Copiar link para site
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyText(getLeadMetaAdsUrl(l.slug), "Link Meta Ads")}>
                          <Copy className="h-4 w-4" />
                          Copiar link Meta Ads
                        </DropdownMenuItem>
                        {canWrite && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEdit(l)}>
                              <Pencil className="h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(l.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {links.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nenhum link rastreável criado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editing ? "Editar link rastreável" : "Novo link rastreável"}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do link</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>WhatsApp receptor</Label>
              <Select
                value={form.instanciaId}
                onChange={(e) => setForm((f) => ({ ...f, instanciaId: e.target.value }))}
              >
                {instancias.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                    {i.telefone ? ` · ${i.telefone}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Mensagem inicial no WhatsApp</Label>
              <Textarea
                value={form.mensagemInicial}
                onChange={(e) => setForm((f) => ({ ...f, mensagemInicial: e.target.value }))}
                rows={3}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                <Label htmlFor="ativo">Link ativo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={!!infoLink} onOpenChange={(v) => !v && setInfoLink(null)}>
        <DialogContent title="Informações do link rastreável" className="max-w-lg">
          {infoLink && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{infoLink.nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={infoLink.ativo ? "success" : "default"}>
                    {infoLink.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">
                    {instanciaPorId.get(infoLink.instancia_id)?.nome ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {format(new Date(infoLink.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Mensagem inicial</p>
                <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3">
                  {infoLink.mensagem_inicial}
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-muted-foreground">Link para site</p>
                  <p className="mt-1 break-all font-mono text-xs">{getLeadPublicUrl(infoLink.slug)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Captura origem e redireciona imediatamente para o WhatsApp.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(getLeadPublicUrl(infoLink.slug), "Link para site")}
                >
                  <Copy className="h-4 w-4" />
                  Copiar link para site
                </Button>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-muted-foreground">Link Meta Ads</p>
                  <p className="mt-1 break-all font-mono text-xs">{getLeadMetaAdsUrl(infoLink.slug)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aguarda 5 segundos na landing, envia PageView à Meta e redireciona ao WhatsApp.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(getLeadMetaAdsUrl(infoLink.slug), "Link Meta Ads")}
                >
                  <Copy className="h-4 w-4" />
                  Copiar link Meta Ads
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInfoLink(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent
          title="Excluir link rastreável"
          description="Os cliques deste link também serão removidos."
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
