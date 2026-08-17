import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useWhatsappSelection } from "@/hooks/useWhatsappSelection";
import { JornadaFunnel } from "@/components/leads/JornadaFunnel";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { WhatsappTabs } from "@/components/leads/WhatsappTabs";
import { LEADS_META_EVENTOS_OPTIONS, META_EVENTO_NENHUM } from "@/lib/leadsMetaEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LeadsInstanciaWhatsapp, LeadsJornadaEtapa } from "@/types/database";
import { LEADS_INSTANCIA_COLUNAS } from "@/types/database";

interface EtapaForm {
  nome: string;
  evento_meta: string;
  primeiro_contato: boolean;
  representa_venda: boolean;
  valor_venda: string;
  palavras_chave: string[];
}

const emptyEtapa: EtapaForm = {
  nome: "",
  evento_meta: META_EVENTO_NENHUM,
  primeiro_contato: false,
  representa_venda: false,
  valor_venda: "",
  palavras_chave: [],
};

export function PipelinePage() {
  const { contaAtiva, canWrite, canDelete } = useConta();
  const routes = useAppRoutes();
  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const { instanciaId, setInstanciaId } = useWhatsappSelection(contaAtiva?.id, instancias);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadsJornadaEtapa | null>(null);
  const [instanciaDialog, setInstanciaDialog] = useState("");
  const [form, setForm] = useState<EtapaForm>(emptyEtapa);
  const [keywordInput, setKeywordInput] = useState("");
  const [deleteEtapa, setDeleteEtapa] = useState<LeadsJornadaEtapa | null>(null);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const [iRes, eRes] = await Promise.all([
      supabase.from("leads_instancias_whatsapp").select(LEADS_INSTANCIA_COLUNAS).eq("conta_id", contaAtiva.id).order("nome"),
      supabase.from("leads_jornada_etapas").select("*").eq("conta_id", contaAtiva.id).order("posicao"),
    ]);
    const lista = (iRes.data as LeadsInstanciaWhatsapp[]) ?? [];
    setInstancias(lista);
    setEtapas((eRes.data as LeadsJornadaEtapa[]) ?? []);
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const instanciaAtiva = instancias.find((i) => i.id === instanciaId) ?? null;

  const etapasInstancia = useMemo(
    () =>
      etapas
        .filter((e) => e.instancia_id === instanciaId)
        .sort((a, b) => a.posicao - b.posicao),
    [etapas, instanciaId]
  );

  const etapaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const etapa of etapas) {
      counts[etapa.instancia_id] = (counts[etapa.instancia_id] ?? 0) + 1;
    }
    return counts;
  }, [etapas]);

  const somenteEtapaPadrao = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const instancia of instancias) {
      const list = etapas.filter((e) => e.instancia_id === instancia.id);
      result[instancia.id] =
        list.length === 0 || (list.length === 1 && list[0].primeiro_contato);
    }
    return result;
  }, [instancias, etapas]);

  const nextPosicao = useMemo(() => {
    if (!instanciaId) return 1;
    const list = etapas.filter((e) => e.instancia_id === instanciaId);
    if (list.length === 0) return 1;
    return Math.max(...list.map((e) => e.posicao)) + 1;
  }, [etapas, instanciaId]);

  const openCreate = () => {
    if (!instanciaId) return;
    setEditing(null);
    setInstanciaDialog(instanciaId);
    setForm({ ...emptyEtapa });
    setKeywordInput("");
    setDialogOpen(true);
  };

  const openEditEtapa = (etapa: LeadsJornadaEtapa) => {
    setEditing(etapa);
    setInstanciaDialog(etapa.instancia_id);
    setForm({
      nome: etapa.nome,
      evento_meta: etapa.evento_meta ?? META_EVENTO_NENHUM,
      primeiro_contato: etapa.primeiro_contato,
      representa_venda: etapa.representa_venda,
      valor_venda: etapa.valor_venda?.toString() ?? "",
      palavras_chave: etapa.palavras_chave ?? [],
    });
    setKeywordInput("");
    setDialogOpen(true);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || form.palavras_chave.includes(kw)) return;
    setForm((f) => ({ ...f, palavras_chave: [...f.palavras_chave, kw] }));
    setKeywordInput("");
  };

  const saveEtapa = async () => {
    if (!contaAtiva || !canWrite) return;
    if (!form.nome.trim()) {
      toast.error("Nome obrigatório.");
      return;
    }
    if (!form.primeiro_contato && form.palavras_chave.length === 0) {
      toast.error("Adicione ao menos uma palavra-chave.");
      return;
    }
    if (form.representa_venda && !form.valor_venda) {
      toast.error("Informe o valor da venda.");
      return;
    }

    const payload = {
      conta_id: contaAtiva.id,
      instancia_id: instanciaDialog,
      nome: form.nome.trim(),
      evento_meta: form.evento_meta,
      primeiro_contato: form.primeiro_contato,
      representa_venda: form.representa_venda,
      valor_venda: form.representa_venda ? Number(form.valor_venda) : null,
      palavras_chave: form.primeiro_contato ? [] : form.palavras_chave,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("leads_jornada_etapas").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Etapa atualizada.");
        setDialogOpen(false);
        void load();
      }
    } else {
      const { error } = await supabase.from("leads_jornada_etapas").insert({
        ...payload,
        posicao: nextPosicao,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Etapa criada.");
        setDialogOpen(false);
        void load();
      }
    }
  };

  const handleReorder = async (ordered: LeadsJornadaEtapa[]) => {
    if (!contaAtiva || !canWrite || reordering) return;

    const withPositions = ordered.map((e, i) => ({ ...e, posicao: i + 1 }));

    setEtapas((prev) => {
      const rest = prev.filter((e) => e.instancia_id !== instanciaId);
      return [...rest, ...withPositions];
    });

    setReordering(true);
    try {
      const results = await Promise.all(
        withPositions.map((e) =>
          supabase
            .from("leads_jornada_etapas")
            .update({ posicao: e.posicao, updated_at: new Date().toISOString() })
            .eq("id", e.id)
            .eq("conta_id", contaAtiva.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        toast.error(failed.error.message);
        void load();
      }
    } finally {
      setReordering(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteEtapa || !canDelete) return;
    const { error } = await supabase.from("leads_jornada_etapas").delete().eq("id", deleteEtapa.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Etapa excluída.");
      setDeleteEtapa(null);
      void load();
    }
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
      <div>
        <p className="text-muted-foreground">
          {instancias.length === 1 && instanciaAtiva ? (
            <>
              Funil do <span className="font-medium text-foreground">{instanciaAtiva.nome}</span>
              {instanciaAtiva.telefone ? ` · ${instanciaAtiva.telefone}` : ""}
            </>
          ) : (
            "Defina as etapas do funil por WhatsApp — palavras-chave e eventos Meta."
          )}
        </p>
      </div>

      {instancias.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <p className="font-medium">Nenhum WhatsApp cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Conecte um WhatsApp para configurar a jornada de compra deste número.
            </p>
            <Button asChild>
              <Link to={routes.whatsapp}>Ir para WhatsApps</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {instanciaAtiva && (
            <Card data-tour="journey-funnel">
              {(instancias.length > 1 || (etapasInstancia.length > 0 && canWrite)) && (
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-6 pt-4">
                  <WhatsappTabs
                    instancias={instancias}
                    value={instanciaId}
                    onChange={setInstanciaId}
                    etapaCounts={etapaCounts}
                    somenteEtapaPadrao={somenteEtapaPadrao}
                  />
                  {etapasInstancia.length > 0 && canWrite && (
                    <Button
                      data-tour="journey-new-stage"
                      className="mb-2 shrink-0"
                      onClick={openCreate}
                    >
                      <Plus className="h-4 w-4" />
                      Nova etapa
                    </Button>
                  )}
                </div>
              )}
              <CardContent className="pt-6">
                <JornadaFunnel
                  etapas={etapasInstancia}
                  canWrite={canWrite && !reordering}
                  canDelete={canDelete}
                  onCreate={openCreate}
                  onEdit={openEditEtapa}
                  onDelete={setDeleteEtapa}
                  onReorder={(ordered) => void handleReorder(ordered)}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editing ? "Editar etapa" : "Nova etapa"}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                disabled={Boolean(editing?.primeiro_contato && form.primeiro_contato)}
              />
            </div>

            {!editing && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.primeiro_contato}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      primeiro_contato: e.target.checked,
                      evento_meta: e.target.checked ? META_EVENTO_NENHUM : f.evento_meta,
                      palavras_chave: e.target.checked ? [] : f.palavras_chave,
                      representa_venda: e.target.checked ? false : f.representa_venda,
                    }))
                  }
                />
                Contato inicial (única por WhatsApp)
              </label>
            )}

            {!form.primeiro_contato && (
              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="Enter para adicionar"
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.palavras_chave.map((kw) => (
                    <Badge key={kw} variant="default">
                      {kw}
                      <button
                        type="button"
                        className="ml-1"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            palavras_chave: f.palavras_chave.filter((k) => k !== kw),
                          }))
                        }
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Quando a Viziom identificar que alguma dessas palavras-chaves foram enviadas pelo
                  atendente, o lead será alterado para essa jornada.
                </p>
              </div>
            )}

            {!form.primeiro_contato && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.representa_venda}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      representa_venda: e.target.checked,
                    }))
                  }
                />
                Essa etapa representa uma venda
              </label>
            )}

            {form.representa_venda && (
              <div className="space-y-1">
                <Label>Valor R$</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_venda}
                  onChange={(e) => setForm((f) => ({ ...f, valor_venda: e.target.value }))}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <MetaLogoIcon className="h-4 w-auto" />
                Evento Meta
              </Label>
              <Select
                value={form.evento_meta}
                onChange={(e) => setForm((f) => ({ ...f, evento_meta: e.target.value }))}
              >
                {LEADS_META_EVENTOS_OPTIONS.map((ev) => (
                  <option key={ev.value || "none"} value={ev.value}>
                    {ev.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Seleciona qual evento de conversão da meta essa etapa está associada. Quando um lead
                for alterado para essa etapa, automaticamente esse evento será enviado para a meta.
              </p>
            </div>
          </div>
          <DialogFooter>
            {canDelete && editing && !editing.primeiro_contato && (
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  setDialogOpen(false);
                  setDeleteEtapa(editing);
                }}
              >
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEtapa()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      <DialogRoot open={!!deleteEtapa} onOpenChange={(v) => !v && setDeleteEtapa(null)}>
        <DialogContent
          title="Excluir etapa"
          description="Leads nesta etapa ficarão sem etapa atribuída."
        >
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEtapa(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
