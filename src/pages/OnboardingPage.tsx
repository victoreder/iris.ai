import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Check, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";
import { contaUrlRef } from "@/lib/appNavigation";
import { META_EVENTO_NENHUM } from "@/lib/leadsMetaEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { LeadsConfig, LeadsInstanciaWhatsapp, LeadsJornadaEtapa } from "@/types/database";

const TOTAL_ETAPAS = 7;

type EstiloCampanha = "anuncios_site_whatsapp" | "anuncios_whatsapp" | "campanha_whatsapp";
type ConnectQrResponse = { qrcode?: string; qrCode?: string; base64?: string; shareUrl?: string };

function qrImageSrc(base64: string) {
  if (base64.startsWith("data:")) return base64;
  return `data:image/png;base64,${base64}`;
}

function extractQrBase64(data: ConnectQrResponse) {
  return data.qrcode ?? data.qrCode ?? data.base64;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { contaAtiva, refreshContas, isAdmin, loading } = useConta();
  const [etapa, setEtapa] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDadosExtras, setLoadingDadosExtras] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [tamanhoEquipe, setTamanhoEquipe] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");
  const [estiloCampanha, setEstiloCampanha] = useState<EstiloCampanha | "">("");

  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [instanciaSelecionada, setInstanciaSelecionada] = useState("");
  const [nomeInstanciaNova, setNomeInstanciaNova] = useState("Atendimento principal");
  const [qrBase64, setQrBase64] = useState("");
  const [qrShareUrl, setQrShareUrl] = useState("");
  const [carregandoQr, setCarregandoQr] = useState(false);

  const [etapasJornada, setEtapasJornada] = useState<LeadsJornadaEtapa[]>([]);
  const [novaEtapaJornada, setNovaEtapaJornada] = useState("");
  const [etapasPendentesJornada, setEtapasPendentesJornada] = useState<string[]>([]);
  const [salvandoJornada, setSalvandoJornada] = useState(false);

  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaTestCode, setMetaTestCode] = useState("");

  const [campanhaNome, setCampanhaNome] = useState("");
  const [campanhaMensagem, setCampanhaMensagem] = useState("Olá! Quero saber mais sobre o atendimento.");
  const [criandoCampanha, setCriandoCampanha] = useState(false);

  const rotaDashboard = useMemo(
    () => (contaAtiva ? `/app/${contaUrlRef(contaAtiva)}/dashboard` : "/app"),
    [contaAtiva]
  );

  const loadDadosExtras = useCallback(async () => {
    if (!contaAtiva) return;
    setLoadingDadosExtras(true);
    const [instRes, etapaRes, metaRes] = await Promise.all([
      supabase
        .from("leads_instancias_whatsapp")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("leads_jornada_etapas")
        .select("*")
        .eq("conta_id", contaAtiva.id)
        .order("posicao", { ascending: true }),
      supabase.from("leads_config").select("*").eq("conta_id", contaAtiva.id).maybeSingle(),
    ]);

    const instDb = (instRes.data as LeadsInstanciaWhatsapp[]) ?? [];
    setInstancias(instDb);
    setEtapasJornada((etapaRes.data as LeadsJornadaEtapa[]) ?? []);
    if (!instanciaSelecionada && instDb[0]?.id) setInstanciaSelecionada(instDb[0].id);
    const metaDb = (metaRes.data as LeadsConfig | null) ?? null;
    setMetaPixelId(metaDb?.meta_pixel_id ?? "");
    setMetaToken(metaDb?.meta_access_token ?? "");
    setMetaTestCode(metaDb?.meta_test_event_code ?? "");
    setLoadingDadosExtras(false);
  }, [contaAtiva, instanciaSelecionada]);

  useEffect(() => {
    if (!contaAtiva) return;
    setEtapa(Math.min(TOTAL_ETAPAS, Math.max(1, contaAtiva.onboarding_etapa_atual || 1)));
    setNomeEmpresa(contaAtiva.nome ?? "");
    setTamanhoEquipe(contaAtiva.empresa_tamanho_funcionarios ?? "");
    setComoConheceu(contaAtiva.empresa_como_conheceu ?? "");
    setEstiloCampanha((contaAtiva.campanha_estilo_principal as EstiloCampanha | null) ?? "");
    void loadDadosExtras();
  }, [contaAtiva, loadDadosExtras]);

  const salvarConta = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!contaAtiva) return;
      const { error } = await supabase.from("contas").update(updates).eq("id", contaAtiva.id);
      if (error) throw error;
      await refreshContas();
    },
    [contaAtiva, refreshContas]
  );

  const avancarEtapa = useCallback(
    async (nextStep: number) => {
      await salvarConta({ onboarding_etapa_atual: Math.min(TOTAL_ETAPAS, nextStep) });
      setEtapa(Math.min(TOTAL_ETAPAS, nextStep));
    },
    [salvarConta]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!contaAtiva) return <Navigate to="/app" replace />;
  if (!contaAtiva.onboarding_pendente) return <Navigate to={rotaDashboard} replace />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Aguardando configuração</CardTitle>
            <CardDescription>O administrador da conta precisa concluir o onboarding.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const salvarEtapaEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !tamanhoEquipe.trim() || !comoConheceu.trim()) {
      toast.error("Preencha todos os campos obrigatórios desta etapa.");
      return;
    }
    setSubmitting(true);
    try {
      await salvarConta({
        nome: nomeEmpresa.trim(),
        empresa_tamanho_funcionarios: tamanhoEquipe.trim(),
        empresa_como_conheceu: comoConheceu.trim(),
      });
      await avancarEtapa(Math.max(etapa + 1, 2));
      toast.success("Informações da empresa salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const salvarEtapaEstilo = async () => {
    if (!estiloCampanha) {
      toast.error("Selecione o estilo de campanhas usado pela empresa.");
      return;
    }
    setSubmitting(true);
    try {
      await salvarConta({ campanha_estilo_principal: estiloCampanha });
      await avancarEtapa(etapa + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const gerarQrCode = async () => {
    setCarregandoQr(true);
    try {
      let instanciaId = instanciaSelecionada;
      if (!instanciaId) {
        const res = await apiPost<{ instancia: { id: string } }>(
          "/api/leads/criar-instancia",
          { nome: nomeInstanciaNova.trim() || "Atendimento principal" },
          contaAtiva.id
        );
        instanciaId = res.instancia.id;
      }
      const qrRes = await apiGet<ConnectQrResponse>(
        "/api/leads/conectar-instancia",
        { instanciaId },
        contaAtiva.id
      );
      const qr = extractQrBase64(qrRes);
      if (!qr) {
        toast.error("QR Code não retornado. Tente novamente.");
        return;
      }
      setQrBase64(qr);
      setQrShareUrl(qrRes.shareUrl ?? "");
      await loadDadosExtras();
      setInstanciaSelecionada(instanciaId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR.");
    } finally {
      setCarregandoQr(false);
    }
  };

  const salvarEtapasJornada = async () => {
    if (!instancias[0]?.id) {
      toast.error("Conecte um WhatsApp antes de configurar a jornada.");
      return;
    }
    if (etapasPendentesJornada.length === 0) {
      await avancarEtapa(etapa + 1);
      return;
    }
    const instanciaId = instanciaSelecionada || instancias[0].id;
    const maxPosicaoAtual = etapasJornada
      .filter((etp) => etp.instancia_id === instanciaId)
      .reduce((acc, curr) => Math.max(acc, curr.posicao), 0);
    setSalvandoJornada(true);
    try {
      const payload = etapasPendentesJornada.map((nome, index) => ({
        conta_id: contaAtiva.id,
        instancia_id: instanciaId,
        nome,
        posicao: maxPosicaoAtual + index + 1,
        palavras_chave: [],
        evento_meta: META_EVENTO_NENHUM,
        primeiro_contato: false,
        representa_venda: false,
        valor_venda: null,
      }));
      const { error } = await supabase.from("leads_jornada_etapas").insert(payload);
      if (error) throw error;
      setEtapasPendentesJornada([]);
      setNovaEtapaJornada("");
      await loadDadosExtras();
      await avancarEtapa(etapa + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar jornada.");
    } finally {
      setSalvandoJornada(false);
    }
  };

  const salvarMeta = async () => {
    if (!metaPixelId.trim() || !metaToken.trim()) {
      toast.error("Para continuar, preencha Pixel ID e Access Token.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(
        "/api/leads/salvar-config-meta",
        {
          metaPixelId: metaPixelId.trim(),
          metaAccessToken: metaToken.trim(),
          metaTestEventCode: metaTestCode.trim() || null,
        },
        contaAtiva.id
      );
      await avancarEtapa(etapa + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar integração Meta.");
    } finally {
      setSubmitting(false);
    }
  };

  const criarCampanha = async () => {
    if (!campanhaNome.trim() || !campanhaMensagem.trim()) {
      toast.error("Preencha os dados da campanha para continuar.");
      return;
    }
    const instanciaId = instanciaSelecionada || instancias[0]?.id;
    if (!instanciaId) {
      toast.error("Conecte um WhatsApp antes de criar a campanha.");
      return;
    }
    setCriandoCampanha(true);
    try {
      await apiPost(
        "/api/leads/criar-link",
        { nome: campanhaNome.trim(), instanciaId, mensagemInicial: campanhaMensagem.trim() },
        contaAtiva.id
      );
      await avancarEtapa(etapa + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar campanha.");
    } finally {
      setCriandoCampanha(false);
    }
  };

  const finalizarOnboarding = async (fazerTour: boolean) => {
    setSubmitting(true);
    try {
      await salvarConta({
        onboarding_pendente: false,
        onboarding_etapa_atual: TOTAL_ETAPAS,
        onboarding_concluido_em: new Date().toISOString(),
      });
      if (fazerTour) toast.message("Tour guiado será disponibilizado em breve.");
      navigate(rotaDashboard, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  const adicionarEtapaPendente = () => {
    const nome = novaEtapaJornada.trim();
    if (!nome) return;
    if (etapasPendentesJornada.some((etp) => etp.toLowerCase() === nome.toLowerCase())) return;
    setEtapasPendentesJornada((prev) => [...prev, nome]);
    setNovaEtapaJornada("");
  };

  const progresso = Math.round((etapa / TOTAL_ETAPAS) * 100);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center bg-background px-4 py-8">
      <Card className="w-full border-border/70 shadow-sm">
        <CardHeader>
          <div className="mb-3 h-2 w-full rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Vamos configurar sua nova Viziom</CardTitle>
              <CardDescription>Etapa {etapa} de {TOTAL_ETAPAS}</CardDescription>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{progresso}%</span>
          </div>
        </CardHeader>
        <CardContent>
          {etapa === 1 && (
            <form onSubmit={salvarEtapaEmpresa} className="space-y-5">
              <div className="space-y-2">
                <Label>Nome da empresa</Label>
                <Input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Tamanho de funcionários</Label>
                <Input value={tamanhoEquipe} onChange={(e) => setTamanhoEquipe(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Como nos conheceu?</Label>
                <Input value={comoConheceu} onChange={(e) => setComoConheceu(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Salvando..." : "Continuar"}
              </Button>
            </form>
          )}

          {etapa === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium">Qual estilo de campanhas você utiliza hoje?</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { id: "anuncios_site_whatsapp", label: "Anuncios -> Site -> WhatsApp" },
                  { id: "anuncios_whatsapp", label: "Anuncios -> WhatsApp" },
                  { id: "campanha_whatsapp", label: "Campanha de WhatsApp" },
                ].map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => setEstiloCampanha(opcao.id as EstiloCampanha)}
                    className={`rounded-md border p-4 text-left text-sm ${
                      estiloCampanha === opcao.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {estiloCampanha === opcao.id ? (
                        <Check className="mt-0.5 h-4 w-4 text-primary" />
                      ) : (
                        <div className="mt-0.5 h-4 w-4 rounded-full border border-muted-foreground/40" />
                      )}
                      <span>{opcao.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa - 1)}>
                  Voltar
                </Button>
                <Button type="button" onClick={() => void salvarEtapaEstilo()} disabled={submitting} className="ml-auto">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium">Primeiro precisamos conectar o WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                Caso não seja você que irá conectar agora, copie o link do QR Code e clique em pular.
              </p>
              {loadingDadosExtras ? (
                <p className="text-sm text-muted-foreground">Carregando dados...</p>
              ) : (
                <>
                  {instancias.length > 0 && (
                    <div className="space-y-2">
                      <Label>WhatsApp já criado</Label>
                      <select
                        value={instanciaSelecionada}
                        onChange={(e) => setInstanciaSelecionada(e.target.value)}
                        className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm"
                      >
                        {instancias.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {instancias.length === 0 && (
                    <div className="space-y-2">
                      <Label>Nome da instância</Label>
                      <Input value={nomeInstanciaNova} onChange={(e) => setNomeInstanciaNova(e.target.value)} />
                    </div>
                  )}
                  <Button type="button" onClick={() => void gerarQrCode()} disabled={carregandoQr}>
                    {carregandoQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    Gerar QR Code
                  </Button>
                  {qrShareUrl && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <a
                        href={qrShareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-sm text-primary hover:underline"
                      >
                        {qrShareUrl}
                      </a>
                    </div>
                  )}
                  {qrBase64 && (
                    <img
                      src={qrImageSrc(qrBase64)}
                      alt="QR Code do WhatsApp"
                      className="mx-auto max-w-xs rounded-lg border border-border"
                    />
                  )}
                </>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa - 1)}>
                  Voltar
                </Button>
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa + 1)}>
                  Conectar depois
                </Button>
                <Button type="button" onClick={() => void avancarEtapa(etapa + 1)} className="ml-auto">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {etapa === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium">Agora vamos configurar sua jornada de vendas</h3>
              <p className="text-sm text-muted-foreground">
                Adicione as etapas que deseja metrificar até a venda.
              </p>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-sm font-medium">Etapas atuais</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {etapasJornada.length === 0 && <li>- Contato inicial será criado automaticamente.</li>}
                  {etapasJornada.map((etp) => (
                    <li key={etp.id}>- {etp.nome}</li>
                  ))}
                  {etapasPendentesJornada.map((etp) => (
                    <li key={etp}>- {etp} (nova)</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Input
                  value={novaEtapaJornada}
                  onChange={(e) => setNovaEtapaJornada(e.target.value)}
                  placeholder="Ex.: Proposta enviada"
                />
                <Button type="button" variant="outline" onClick={adicionarEtapaPendente}>
                  Adicionar etapa
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa - 1)}>
                  Voltar
                </Button>
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa + 1)}>
                  Configurar depois
                </Button>
                <Button type="button" onClick={() => void salvarEtapasJornada()} disabled={salvandoJornada} className="ml-auto">
                  {salvandoJornada ? "Salvando..." : "Continuar"}
                </Button>
              </div>
            </div>
          )}

          {etapa === 5 && (
            <div className="space-y-4">
              <h3 className="font-medium">Configure seu Pixel do Meta e API de Conversão</h3>
              <div className="space-y-2">
                <Label>Pixel ID</Label>
                <Input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Access Token (CAPI)</Label>
                <Input type="password" value={metaToken} onChange={(e) => setMetaToken(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Codigo de teste (opcional)</Label>
                <Input value={metaTestCode} onChange={(e) => setMetaTestCode(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa - 1)}>
                  Voltar
                </Button>
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa + 1)}>
                  Configurar depois
                </Button>
                <Button type="button" onClick={() => void salvarMeta()} disabled={submitting} className="ml-auto">
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {etapa === 6 && (
            <div className="space-y-4">
              <h3 className="font-medium">Agora vamos criar sua primeira campanha</h3>
              <div className="space-y-2">
                <Label>Nome da campanha</Label>
                <Input value={campanhaNome} onChange={(e) => setCampanhaNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem inicial</Label>
                <Textarea value={campanhaMensagem} onChange={(e) => setCampanhaMensagem(e.target.value)} rows={3} />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa - 1)}>
                  Voltar
                </Button>
                <Button type="button" variant="outline" onClick={() => void avancarEtapa(etapa + 1)}>
                  Criar depois
                </Button>
                <Button type="button" onClick={() => void criarCampanha()} disabled={criandoCampanha} className="ml-auto">
                  {criandoCampanha ? "Criando..." : "Continuar"}
                </Button>
              </div>
            </div>
          )}

          {etapa >= 7 && (
            <div className="space-y-4 text-center">
              <h3 className="text-lg font-semibold">Meus parabéns, sua conta está configurada!</h3>
              <p className="text-sm text-muted-foreground">Deseja um tour por dentro do Viziom?</p>
              <div className="flex justify-center gap-2">
                <Button type="button" onClick={() => void finalizarOnboarding(true)} disabled={submitting}>
                  Fazer tour
                </Button>
                <Button type="button" variant="outline" onClick={() => void finalizarOnboarding(false)} disabled={submitting}>
                  Pular
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
