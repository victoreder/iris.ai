import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DialogRoot, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { apiPost } from "@/lib/api";
import {
  getOriginLabel,
  isMetaOrigin,
  formatPhoneBR,
  stripInvisibleChars,
} from "@/lib/leadsAnalytics";
import { useConta } from "@/contexts/ContaContext";
import type { LeadsClique, LeadsJornadaEtapa } from "@/types/database";

interface Props {
  lead: LeadsClique | null;
  etapas: LeadsJornadaEtapa[];
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function LeadDetailDialog({ lead, etapas, open, onClose, onUpdated }: Props) {
  const { contaAtiva, canWrite } = useConta();
  const [etapaId, setEtapaId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) setEtapaId(lead.etapa_id ?? "");
  }, [lead]);

  if (!lead || !contaAtiva) return null;

  const instanciaId = lead.instancia_id ?? lead.leads_links?.instancia_id;
  const etapasInstancia = etapas.filter((e) => e.instancia_id === instanciaId);

  const handleSaveEtapa = async () => {
    if (!etapaId || !canWrite) return;
    setSaving(true);
    try {
      const result = await apiPost<{
        meta?: { ok?: boolean; error?: string };
      }>("/api/leads/atualizar-etapa-lead", { cliqueId: lead.id, etapaId }, contaAtiva.id);

      if (result.meta?.ok) toast.success("Etapa salva e Meta enviada.");
      else if (result.meta?.error) toast.warning(`Etapa salva. Meta: ${result.meta.error}`);
      else toast.success("Etapa atualizada.");
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Detalhes do lead" className="max-w-xl">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground">Telefone</p>
              <p className="font-medium">{formatPhoneBR(lead.telefone_lead)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Campanha</p>
              <p className="font-medium">{lead.leads_links?.nome ?? "WhatsApp direto"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Origem</p>
              <div className="flex items-center gap-2">
                {isMetaOrigin(lead) && <MetaOriginBadge />}
                <span>{getOriginLabel(lead)}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{lead.status}</p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-muted-foreground">UTMs / atribuição</p>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-xs">
              <span>Source: {lead.utm_source ?? "—"}</span>
              <span>Medium: {lead.utm_medium ?? "—"}</span>
              <span>Campaign: {lead.utm_campaign ?? "—"}</span>
              <span>Content: {lead.utm_content ?? "—"}</span>
              <span>Term: {lead.utm_term ?? "—"}</span>
            </div>
          </div>

          {instanciaId && etapasInstancia.length > 0 && canWrite && (
            <div className="space-y-2">
              <Label>Jornada</Label>
              <Select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
                <option value="">Selecione…</option>
                {etapasInstancia.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={handleSaveEtapa} disabled={!etapaId || saving}>
                {saving ? "Salvando…" : "Salvar etapa e enviar Meta"}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>fbclid: {lead.fbclid ?? "—"}</span>
            <span>gclid: {lead.gclid ?? "—"}</span>
            <span>IP: {lead.ip_address ?? "—"}</span>
            <span>fbp: {lead.fbp ?? "—"}</span>
            <span>fbc: {lead.fbc ?? "—"}</span>
            <span>
              Clique:{" "}
              {format(new Date(lead.convertido_at ?? lead.created_at), "dd/MM/yyyy HH:mm", {
                locale: ptBR,
              })}
            </span>
          </div>

          {lead.referrer && (
            <p className="truncate text-xs text-muted-foreground">Referrer: {lead.referrer}</p>
          )}
          {lead.landing_url && (
            <p className="truncate text-xs text-muted-foreground">Landing: {lead.landing_url}</p>
          )}
          {lead.mensagem_recebida && (
            <div>
              <p className="text-muted-foreground">Mensagem recebida</p>
              <p className="mt-1 rounded-md bg-muted p-2 text-xs">
                {stripInvisibleChars(lead.mensagem_recebida)}
              </p>
            </div>
          )}
          {lead.meta_erro && (
            <p className="text-xs text-destructive">Erro Meta: {lead.meta_erro}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
