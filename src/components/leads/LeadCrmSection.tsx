import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, StickyNote, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useConta } from "@/contexts/ContaContext";
import { apiPost } from "@/lib/api";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/leadCrm";
import { supabase } from "@/lib/supabase";
import type { LeadsClique } from "@/types/database";
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
  const [observacao, setObservacao] = useState(lead.observacao ?? "");
  const [followUp, setFollowUp] = useState(toDatetimeLocalValue(lead.data_follow_up));
  const [reuniao, setReuniao] = useState(toDatetimeLocalValue(lead.data_reuniao));
  const [responsavelId, setResponsavelId] = useState(lead.responsavel_id ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setObservacao(lead.observacao ?? "");
    setFollowUp(toDatetimeLocalValue(lead.data_follow_up));
    setReuniao(toDatetimeLocalValue(lead.data_reuniao));
    setResponsavelId(lead.responsavel_id ?? "");
  }, [lead.id, lead.observacao, lead.data_follow_up, lead.data_reuniao, lead.responsavel_id]);

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

  const dirty = useMemo(() => {
    return (
      observacao.trim() !== (lead.observacao ?? "").trim() ||
      followUp !== toDatetimeLocalValue(lead.data_follow_up) ||
      reuniao !== toDatetimeLocalValue(lead.data_reuniao) ||
      (responsavelId || null) !== (lead.responsavel_id ?? null)
    );
  }, [observacao, followUp, reuniao, responsavelId, lead]);

  const handleSave = async () => {
    if (!contaAtiva || !canWrite) return;
    setSaving(true);
    try {
      await apiPost(
        "/api/leads/atualizar-crm-lead",
        {
          cliqueId: lead.id,
          observacao: observacao.trim() || null,
          dataFollowUp: fromDatetimeLocalValue(followUp),
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

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">CRM</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-follow-up" className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            Follow-up
          </Label>
          <Input
            id="lead-follow-up"
            type="datetime-local"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            disabled={!canWrite}
          />
        </div>
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
        <div className="space-y-1.5 sm:col-span-2">
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
  );
}
