import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Route, UserRound } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { LeadConversaChat } from "@/components/leads/LeadConversaChat";
import { LeadDetailGeralPanel } from "@/components/leads/LeadDetailGeralPanel";
import { LeadDetailJornadaPanel } from "@/components/leads/LeadDetailJornadaPanel";
import { resolveLeadOrigens } from "@/lib/leadOrigens";
import { MetaOriginBadge } from "@/components/leads/MetaOriginBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/badge";
import { useConta } from "@/contexts/ContaContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { apiPost } from "@/lib/api";
import {
  LEAD_DETAIL_TABS,
  leadDetailPath,
  parseLeadDetailTab,
  type LeadDetailTab,
} from "@/lib/leadDetailTabs";
import { LEAD_DETAIL_SELECT } from "@/lib/leadsConstants";
import { formatPhoneBR, isMetaOrigin } from "@/lib/leadsAnalytics";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type {
  LeadsClique,
  LeadsCliqueEvento,
  LeadsCliqueMensagem,
  LeadsCliqueOrigem,
  LeadsJornadaEtapa,
} from "@/types/database";

const TAB_ICONS: Record<LeadDetailTab, typeof UserRound> = {
  geral: UserRound,
  jornada: Route,
  conversa: MessageCircle,
};

export function LeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contaAtiva, canWrite } = useConta();

  const tab = parseLeadDetailTab(searchParams.get("tab"));

  const [lead, setLead] = useState<LeadsClique | null>(null);
  const [etapas, setEtapas] = useState<LeadsJornadaEtapa[]>([]);
  const [historico, setHistorico] = useState<LeadsCliqueEvento[]>([]);
  const [mensagens, setMensagens] = useState<LeadsCliqueMensagem[]>([]);
  const [origens, setOrigens] = useState<LeadsCliqueOrigem[]>([]);
  const [loadingOrigens, setLoadingOrigens] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(true);
  const [loadingMensagens, setLoadingMensagens] = useState(true);
  const [etapaId, setEtapaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingValor, setSavingValor] = useState(false);

  const phoneTitle = lead ? formatPhoneBR(lead.telefone_lead) : "Lead";
  useDocumentTitle(phoneTitle);

  const loadLead = useCallback(async () => {
    if (!contaAtiva || !leadId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads_cliques")
      .select(LEAD_DETAIL_SELECT)
      .eq("id", leadId)
      .eq("conta_id", contaAtiva.id)
      .maybeSingle();

    if (error || !data) {
      setLead(null);
      setLoading(false);
      return;
    }

    setLead(data as LeadsClique);
    setEtapaId((data as LeadsClique).etapa_id ?? "");
    setLoading(false);
  }, [contaAtiva?.id, leadId]);

  const loadEtapas = useCallback(async () => {
    if (!contaAtiva) return;
    const { data } = await supabase
      .from("leads_jornada_etapas")
      .select("*")
      .eq("conta_id", contaAtiva.id)
      .order("posicao");
    setEtapas((data as LeadsJornadaEtapa[]) ?? []);
  }, [contaAtiva?.id]);

  const loadHistorico = useCallback(async () => {
    if (!leadId) return;
    setLoadingHistorico(true);
    const { data } = await supabase
      .from("leads_cliques_eventos")
      .select("*")
      .eq("clique_id", leadId)
      .order("created_at", { ascending: false });
    setHistorico((data as LeadsCliqueEvento[]) ?? []);
    setLoadingHistorico(false);
  }, [leadId]);

  const loadMensagens = useCallback(async () => {
    if (!leadId) return;
    setLoadingMensagens(true);
    const { data } = await supabase
      .from("leads_cliques_mensagens")
      .select("*")
      .eq("clique_id", leadId)
      .order("mensagem_em", { ascending: true });
    setMensagens((data as LeadsCliqueMensagem[]) ?? []);
    setLoadingMensagens(false);
  }, [leadId]);

  const loadOrigens = useCallback(async () => {
    if (!lead) return;
    setLoadingOrigens(true);
    const rows = await resolveLeadOrigens(lead);
    setOrigens(rows);
    setLoadingOrigens(false);
  }, [lead]);

  useEffect(() => {
    void loadLead();
    void loadEtapas();
  }, [loadLead, loadEtapas]);

  useEffect(() => {
    if (!lead) return;
    void loadHistorico();
    void loadMensagens();
    void loadOrigens();
  }, [lead?.id, loadHistorico, loadMensagens, loadOrigens]);

  const setTab = (next: LeadDetailTab) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "geral") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true }
    );
  };

  const handleSaveEtapa = async () => {
    if (!lead || !etapaId || !contaAtiva || !canWrite) return;
    setSaving(true);
    try {
      const result = await apiPost<{ meta?: { ok?: boolean; error?: string } }>(
        "/api/leads/atualizar-etapa-lead",
        { cliqueId: lead.id, etapaId },
        contaAtiva.id
      );
      if (result.meta?.ok) toast.success("Etapa salva e Meta enviada.");
      else if (result.meta?.error) toast.warning(`Etapa salva. Meta: ${result.meta.error}`);
      else toast.success("Etapa atualizada.");
      await loadLead();
      await loadHistorico();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveValorVenda = async (valor: number | null) => {
    if (!lead || !contaAtiva || !canWrite) return;
    setSavingValor(true);
    try {
      await apiPost(
        "/api/leads/atualizar-valor-venda-lead",
        { cliqueId: lead.id, valorVenda: valor },
        contaAtiva.id
      );
      toast.success(valor != null ? "Valor da venda salvo." : "Valor restaurado ao padrão da etapa.");
      await loadLead();
      await loadHistorico();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar valor.");
    } finally {
      setSavingValor(false);
    }
  };

  const handleResetValorVenda = () => {
    void handleSaveValorVenda(null);
  };

  if (!leadId) return <Navigate to="/app/leads" replace />;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-none" />
        <Skeleton className="mx-4 h-64 rounded-xl sm:mx-6" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">Lead não encontrado</p>
        <Button asChild variant="outline">
          <Link to="/app/leads">Voltar para Leads</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="w-full shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-start gap-3 px-4 py-3 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => navigate("/app/leads")}
            aria-label="Voltar para Leads"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold">{formatPhoneBR(lead.telefone_lead)}</h1>
              {isMetaOrigin(lead) && <MetaOriginBadge />}
              {lead.leads_jornada_etapas?.nome && (
                <Badge variant="outline" className="font-normal">
                  {lead.leads_jornada_etapas.nome}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {lead.leads_links?.nome ?? "WhatsApp direto"}
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-0 sm:px-6" aria-label="Seções do lead">
          {LEAD_DETAIL_TABS.map(({ key, label }) => {
            const Icon = TAB_ICONS[key];
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="lead-panel-bg flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "geral" && (
          <div className="flex-1 overflow-y-auto">
            <LeadDetailGeralPanel lead={lead} origens={origens} loadingOrigens={loadingOrigens} />
          </div>
        )}

        {tab === "jornada" && (
          <div className="flex-1 overflow-y-auto">
            <LeadDetailJornadaPanel
              lead={lead}
              etapas={etapas}
              historico={historico}
              loadingHistorico={loadingHistorico}
              canWrite={canWrite}
              etapaId={etapaId}
              saving={saving}
              savingValor={savingValor}
              onEtapaIdChange={setEtapaId}
              onSaveEtapa={handleSaveEtapa}
              onSaveValorVenda={handleSaveValorVenda}
              onResetValorVenda={handleResetValorVenda}
            />
          </div>
        )}

        {tab === "conversa" && (
          <LeadConversaChat
            lead={lead}
            mensagens={mensagens}
            loading={loadingMensagens}
            active={tab === "conversa"}
          />
        )}
      </div>
    </div>
  );
}

/** Redireciona URLs legadas ?lead=id para /app/leads/:id */
export function InboxLegacyLeadRedirect() {
  const [searchParams] = useSearchParams();
  const legacyId = searchParams.get("lead");
  if (!legacyId) return null;
  const tab = parseLeadDetailTab(searchParams.get("tab"));
  return <Navigate to={leadDetailPath(legacyId, tab)} replace />;
}
