import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { JornadaFunnel } from "@/components/leads/JornadaFunnel";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { LEADS_META_EVENTOS_OPTIONS, META_EVENTO_NENHUM } from "@/lib/leadsMetaEvents";
import { FieldHint } from "@/components/onboarding/FieldHint";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import type { LeadsInstanciaWhatsapp, LeadsJornadaEtapa } from "@/types/database";

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

interface OnboardingJornadaStepProps {
  contaId: string;
  instancias: LeadsInstanciaWhatsapp[];
  instanciaIdInicial?: string;
  onEtapasChange?: () => void;
}

export function OnboardingJornadaStep({
  contaId,
  instancias,
  instanciaIdInicial,
  onEtapasChange,
}: OnboardingJornadaStepProps) {
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [instanciaId, setInstanciaId] = useState(instanciaIdInicial ?? instancias[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadsJornadaEtapa | null>(null);
  const [form, setForm] = useState<EtapaForm>(emptyEtapa);
  const [keywordInput, setKeywordInput] = useState("");
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads_jornada_etapas")
      .select("*")
      .eq("conta_id", contaId)
      .order("posicao", { ascending: true });
    setEtapas((data as LeadsJornadaEtapa[]) ?? []);
    setLoading(false);
    onEtapasChange?.();
  }, [contaId, onEtapasChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (instanciaIdInicial) setInstanciaId(instanciaIdInicial);
    else if (!instanciaId && instancias[0]?.id) setInstanciaId(instancias[0].id);
  }, [instanciaIdInicial, instancias, instanciaId]);

  const etapasInstancia = useMemo(
    () =>
      etapas
        .filter((e) => e.instancia_id === instanciaId)
        .sort((a, b) => a.posicao - b.posicao),
    [etapas, instanciaId]
  );

  const nextPosicao = useMemo(() => {
    if (!instanciaId) return 1;
    const list = etapas.filter((e) => e.instancia_id === instanciaId);
    if (list.length === 0) return 1;
    return Math.max(...list.map((e) => e.posicao)) + 1;
  }, [etapas, instanciaId]);

  const openCreate = () => {
    if (!instanciaId) return;
    setEditing(null);
    setForm({ ...emptyEtapa });
    setKeywordInput("");
    setDialogOpen(true);
  };

  const openEditEtapa = (etapa: LeadsJornadaEtapa) => {
    setEditing(etapa);
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
    if (!instanciaId) return;
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
      conta_id: contaId,
      instancia_id: instanciaId,
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
    if (reordering) return;
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
            .eq("conta_id", contaId)
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

  if (instancias.length === 0) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Conecte um WhatsApp na etapa anterior para configurar a jornada de vendas.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {instancias.length > 1 && (
        <div className="mb-4 space-y-2">
          <Label>WhatsApp</Label>
          <Select value={instanciaId} onChange={(e) => setInstanciaId(e.target.value)}>
            {instancias.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
                {i.telefone ? ` · ${i.telefone}` : ""}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            A etapa de contato inicial já foi criada automaticamente.
          </p>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova etapa
          </Button>
        </div>
        <JornadaFunnel
          etapas={etapasInstancia}
          canWrite
          canDelete={false}
          onCreate={openCreate}
          onEdit={openEditEtapa}
          onDelete={() => {}}
          onReorder={(ordered) => void handleReorder(ordered)}
        />
      </div>

      <DialogRoot open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editing ? "Editar etapa" : "Nova etapa"}>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome da etapa</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                disabled={Boolean(editing?.primeiro_contato && form.primeiro_contato)}
                placeholder="Ex.: Proposta enviada"
              />
            </div>

            {!editing && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="mt-0.5"
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
                  Contato inicial
                </label>
                <FieldHint>
                  Marque essa opção quando essa for a etapa que representa a primeira interação do lead
                  com a empresa, o contato inicial.
                </FieldHint>
              </div>
            )}

            {!form.primeiro_contato && (
              <div className="space-y-2">
                <Label>Palavras-chave</Label>
                <FieldHint>
                  Coloque as palavras-chaves que o atendente irá enviar no WhatsApp durante a conversa que
                  marcam que chegou nessa etapa. O Viziom identifica automaticamente e move o lead para esta
                  etapa.
                </FieldHint>
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
              </div>
            )}

            {!form.primeiro_contato && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <label className="flex cursor-pointer items-start gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.representa_venda}
                    onChange={(e) => setForm((f) => ({ ...f, representa_venda: e.target.checked }))}
                  />
                  Essa etapa representa uma venda
                </label>
                <FieldHint>
                  Marque essa opção quando essa etapa representa uma venda no seu funil.
                </FieldHint>
              </div>
            )}

            {form.representa_venda && (
              <div className="space-y-1">
                <Label>Valor da venda (R$)</Label>
                <FieldHint>
                  Informe o valor padrão de venda dos leads. Esse valor pode ser editado individualmente para
                  cada lead depois.
                </FieldHint>
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
                Evento da Meta
              </Label>
              <FieldHint>
                Selecione qual evento deseja enviar para a Meta quando o lead for movido para essa etapa.
              </FieldHint>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEtapa()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
}
