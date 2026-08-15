import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Check, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import {
  formatCrmDateTime,
  fromDatetimeLocalValue,
  isFollowUpOverdue,
  toDatetimeLocalValue,
} from "@/lib/leadCrm";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { LeadsClique, LeadsCliqueFollowUp } from "@/types/database";
import type { Usuario } from "@/types/usuario";

type MembroOption = {
  id: string;
  nome: string | null;
  email: string | null;
};

interface Props {
  lead: LeadsClique;
  canWrite: boolean;
  onSaved?: () => Promise<void> | void;
}

export function LeadCrmSection({ lead, canWrite, onSaved }: Props) {
  const { contaAtiva } = useConta();
  const [membros, setMembros] = useState<MembroOption[]>([]);
  const [followUps, setFollowUps] = useState<LeadsCliqueFollowUp[]>([]);
  const [observacao, setObservacao] = useState(lead.observacao ?? "");
  const [reuniao, setReuniao] = useState(toDatetimeLocalValue(lead.data_reuniao));
  const [responsavelId, setResponsavelId] = useState(lead.responsavel_id ?? "");
  const [novoFollowUp, setNovoFollowUp] = useState("");
  const [novaObsFollowUp, setNovaObsFollowUp] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setObservacao(lead.observacao ?? "");
    setReuniao(toDatetimeLocalValue(lead.data_reuniao));
    setResponsavelId(lead.responsavel_id ?? "");
  }, [lead.id, lead.observacao, lead.data_reuniao, lead.responsavel_id]);

  useEffect(() => {
    if (!contaAtiva) return;
    void supabase
      .from("conta_membros")
      .select("user_id, usuarios(id, nome, email)")
      .eq("conta_id", contaAtiva.id)
      .then(({ data }) => {
        const rows = (data ?? []) as {
          user_id: string;
          usuarios: Pick<Usuario, "id" | "nome" | "email"> | null;
        }[];
        setMembros(
          rows.map((row) => ({
            id: row.usuarios?.id ?? row.user_id,
            nome: row.usuarios?.nome ?? null,
            email: row.usuarios?.email ?? null,
          }))
        );
      });
  }, [contaAtiva?.id]);

  const loadFollowUps = async () => {
    const { data } = await supabase
      .from("leads_cliques_follow_ups")
      .select("*")
      .eq("clique_id", lead.id)
      .order("concluido", { ascending: true })
      .order("data_follow_up", { ascending: true });
    setFollowUps((data as LeadsCliqueFollowUp[]) ?? []);
  };

  useEffect(() => {
    void loadFollowUps();
  }, [lead.id]);

  const dirty = useMemo(() => {
    return (
      observacao.trim() !== (lead.observacao ?? "").trim() ||
      reuniao !== toDatetimeLocalValue(lead.data_reuniao) ||
      (responsavelId || null) !== (lead.responsavel_id ?? null)
    );
  }, [observacao, reuniao, responsavelId, lead]);

  const handleSave = async () => {
    if (!contaAtiva || !canWrite) return;
    setSaving(true);
    try {
      await apiPost(
        "/api/leads/atualizar-crm-lead",
        {
          cliqueId: lead.id,
          observacao: observacao.trim() || null,
          dataReuniao: fromDatetimeLocalValue(reuniao),
          responsavelId: responsavelId || null,
        },
        contaAtiva.id
      );
      toast.success("CRM do lead atualizado.");
      await onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar CRM.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!contaAtiva || !canWrite) return;
    const dataFollowUp = fromDatetimeLocalValue(novoFollowUp);
    if (!dataFollowUp) {
      toast.error("Informe a data do follow-up.");
      return;
    }
    setSavingFollowUp(true);
    try {
      await apiPost(
        "/api/leads/follow-up-lead",
        {
          acao: "criar",
          cliqueId: lead.id,
          dataFollowUp,
          observacao: novaObsFollowUp.trim() || null,
        },
        contaAtiva.id
      );
      setNovoFollowUp("");
      setNovaObsFollowUp("");
      await loadFollowUps();
      await onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar follow-up.");
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleToggleFollowUp = async (item: LeadsCliqueFollowUp) => {
    if (!contaAtiva || !canWrite) return;
    setTogglingId(item.id);
    try {
      await apiPost(
        "/api/leads/follow-up-lead",
        {
          acao: "concluir",
          cliqueId: lead.id,
          followUpId: item.id,
          concluido: !item.concluido,
        },
        contaAtiva.id
      );
      await loadFollowUps();
      await onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar follow-up.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold">Follow-ups</h3>
        {canWrite && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="novo-follow-up" className="flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                Data
              </Label>
              <Input
                id="novo-follow-up"
                type="datetime-local"
                value={novoFollowUp}
                onChange={(e) => setNovoFollowUp(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nova-obs-follow-up">Observação</Label>
              <Textarea
                id="nova-obs-follow-up"
                rows={2}
                placeholder="O que precisa ser feito neste follow-up…"
                value={novaObsFollowUp}
                onChange={(e) => setNovaObsFollowUp(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void handleAddFollowUp()} disabled={savingFollowUp}>
                <Plus className="h-4 w-4" />
                {savingFollowUp ? "Adicionando…" : "Adicionar follow-up"}
              </Button>
            </div>
          </div>
        )}

        <ul className={cn("space-y-2", canWrite && "mt-4 border-t border-border pt-4")}>
          {followUps.length === 0 && (
            <li className="py-4 text-center text-sm text-muted-foreground">Nenhum follow-up ainda</li>
          )}
          {followUps.map((item) => {
            const overdue = !item.concluido && isFollowUpOverdue(item.data_follow_up);
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border px-3 py-2.5",
                  item.concluido && "bg-muted/40"
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={item.concluido}
                  aria-label={item.concluido ? "Reabrir follow-up" : "Concluir follow-up"}
                  disabled={!canWrite || togglingId === item.id}
                  onClick={() => void handleToggleFollowUp(item)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    item.concluido
                      ? "border-success bg-success text-white"
                      : "border-border bg-card hover:border-primary",
                    (!canWrite || togglingId === item.id) && "opacity-60"
                  )}
                >
                  {item.concluido && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      item.concluido && "text-muted-foreground line-through",
                      overdue && "text-destructive"
                    )}
                  >
                    {formatCrmDateTime(item.data_follow_up)}
                    {overdue ? " · atrasado" : ""}
                    {item.concluido ? " · concluído" : ""}
                  </p>
                  {item.observacao?.trim() && (
                    <p
                      className={cn(
                        "mt-0.5 text-sm text-muted-foreground",
                        item.concluido && "line-through"
                      )}
                    >
                      {item.observacao}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-reuniao" className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              Reunião marcada
            </Label>
            <Input
              id="lead-reuniao"
              type="datetime-local"
              value={reuniao}
              onChange={(e) => setReuniao(e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-responsavel" className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              Responsável
            </Label>
            <Select
              id="lead-responsavel"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              disabled={!canWrite}
            >
              <option value="">Sem responsável</option>
              {membros.map((membro) => (
                <option key={membro.id} value={membro.id}>
                  {membro.nome?.trim() || membro.email || "Membro"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-observacao">Observação</Label>
            <Textarea
              id="lead-observacao"
              rows={4}
              placeholder="Anotações internas sobre este lead…"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={!canWrite}
            />
          </div>
        </div>

        {canWrite && (
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? "Salvando…" : "Salvar CRM"}
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
