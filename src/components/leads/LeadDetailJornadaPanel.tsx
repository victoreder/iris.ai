import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { describeLeadEvento, LEAD_EVENTO_LABELS } from "@/lib/leadEventos";
import {
  formatValorVendaBR,
  parseValorVendaInput,
  resolveLeadValorVenda,
} from "@/lib/leadValorVenda";
import { getMetaEventoLabel } from "@/lib/leadsMetaEvents";
import type { LeadsClique, LeadsCliqueEvento, LeadsJornadaEtapa } from "@/types/database";

const eventoBadgeVariant = {
  lead_novo: "success" as const,
  etapa_alterada: "default" as const,
  meta_enviado: "meta" as const,
  valor_venda_alterado: "warning" as const,
  origem_adicional: "primary" as const,
};

interface Props {
  lead: LeadsClique;
  etapas: LeadsJornadaEtapa[];
  historico: LeadsCliqueEvento[];
  loadingHistorico: boolean;
  canWrite: boolean;
  etapaId: string;
  saving: boolean;
  savingValor: boolean;
  onEtapaIdChange: (id: string) => void;
  onSaveEtapa: () => void;
  onSaveValorVenda: (valor: number | null) => void;
  onResetValorVenda: () => void;
}

export function LeadDetailJornadaPanel({
  lead,
  etapas,
  historico,
  loadingHistorico,
  canWrite,
  etapaId,
  saving,
  savingValor,
  onEtapaIdChange,
  onSaveEtapa,
  onSaveValorVenda,
  onResetValorVenda,
}: Props) {
  const instanciaId = lead.instancia_id ?? lead.leads_links?.instancia_id;
  const etapasInstancia = etapas.filter((e) => e.instancia_id === instanciaId);
  const etapaAtual = lead.leads_jornada_etapas;
  const etapaCompleta = useMemo(
    () => etapas.find((e) => e.id === etapaAtual?.id),
    [etapas, etapaAtual?.id]
  );
  const isEtapaVenda = Boolean(etapaAtual?.representa_venda);
  const valorExibido = resolveLeadValorVenda(lead, etapaCompleta);
  const valorPadraoEtapa = etapaCompleta?.valor_venda ?? etapaAtual?.valor_venda ?? null;
  const usaValorPersonalizado = lead.valor_venda != null;

  const [valorInput, setValorInput] = useState("");

  useEffect(() => {
    const valor = resolveLeadValorVenda(lead, etapaCompleta);
    setValorInput(valor != null ? String(valor) : "");
  }, [lead.id, lead.valor_venda, etapaCompleta]);

  const handleSaveValor = () => {
    const parsed = parseValorVendaInput(valorInput);
    if (parsed == null && valorInput.trim()) return;
    onSaveValorVenda(parsed);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa atual</p>
        <div className="mt-2 flex items-center gap-2">
          {isEtapaVenda && <DollarSign className="h-6 w-6 shrink-0 text-success" aria-hidden />}
          <p className="text-2xl font-semibold tracking-tight">
            {etapaAtual?.nome ?? "Sem etapa"}
          </p>
        </div>
        {isEtapaVenda && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Valor da venda
            </p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatValorVendaBR(valorExibido)}</p>
            {!usaValorPersonalizado && valorPadraoEtapa != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Usando valor padrão da etapa
              </p>
            )}
            {usaValorPersonalizado && (
              <p className="mt-1 text-xs text-muted-foreground">Valor personalizado deste lead</p>
            )}

            {canWrite && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="valor-venda-lead">Editar valor (R$)</Label>
                  <Input
                    id="valor-venda-lead"
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 1500 ou 1500,50"
                    value={valorInput}
                    onChange={(e) => setValorInput(e.target.value)}
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  {usaValorPersonalizado && valorPadraoEtapa != null && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onResetValorVenda}
                      disabled={savingValor}
                    >
                      Padrão da etapa
                    </Button>
                  )}
                  <Button type="button" onClick={handleSaveValor} disabled={savingValor}>
                    {savingValor ? "Salvando…" : "Salvar valor"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {lead.etapa_atualizada_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            Atualizada em{" "}
            {format(new Date(lead.etapa_atualizada_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        )}
      </div>

      {instanciaId && etapasInstancia.length > 0 && canWrite && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium">Alterar etapa manualmente</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1">
              <Label>Nova etapa</Label>
              <Select value={etapaId} onChange={(e) => onEtapaIdChange(e.target.value)}>
                <option value="">Selecione…</option>
                {etapasInstancia.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                    {e.representa_venda ? " ($)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button onClick={onSaveEtapa} disabled={!etapaId || saving} className="shrink-0">
              {saving ? "Salvando…" : "Salvar e enviar Meta"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="font-medium">Histórico da jornada</p>
          <p className="text-xs text-muted-foreground">Conversões, mudanças de etapa e envios Meta</p>
        </div>
        <div className="p-5">
          {loadingHistorico ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          ) : (
            <ul className="space-y-4">
              {historico.map((evento) => (
                <li key={evento.id} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={eventoBadgeVariant[evento.tipo]}>
                        {LEAD_EVENTO_LABELS[evento.tipo]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(evento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{describeLeadEvento(evento)}</p>
                    {evento.tipo === "meta_enviado" && evento.evento_meta && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Evento: {getMetaEventoLabel(evento.evento_meta)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {lead.meta_erro && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Erro Meta: {lead.meta_erro}
        </p>
      )}
    </div>
  );
}
