import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useConta } from "@/contexts/ContaContext";
import { useProductTourOptional } from "@/contexts/ProductTourContext";
import { supabase } from "@/lib/supabase";
import { apiGet, apiPost } from "@/lib/api";
import { contaUrlRef } from "@/lib/appNavigation";
import {
  formatComoConheceu,
  isNomeEmpresaPlaceholder,
  ONBOARDING_COMO_CONHECEU_OPCOES,
  ONBOARDING_TAMANHO_OPCOES,
  parseComoConheceu,
  type OnboardingComoConheceu,
} from "@/lib/onboarding";
import { OnboardingJornadaStep } from "@/components/onboarding/OnboardingJornadaStep";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { LeadsConfig, LeadsInstanciaWhatsapp } from "@/types/database";
import { LEADS_INSTANCIA_COLUNAS } from "@/types/database";

const TOTAL_ETAPAS = 7;

type EstiloCampanha = "anuncios_site_whatsapp" | "anuncios_whatsapp" | "campanha_whatsapp";
type ConnectQrResponse = { qrcode?: string; qrCode?: string; base64?: string; shareUrl?: string };

const ESTILO_CAMPANHA_OPCOES: { id: EstiloCampanha; label: string }[] = [
  { id: "anuncios_site_whatsapp", label: "Anúncios → Site → WhatsApp" },
  { id: "anuncios_whatsapp", label: "Anúncios → WhatsApp" },
  { id: "campanha_whatsapp", label: "Campanha de WhatsApp" },
];

function qrImageSrc(base64: string) {
  if (base64.startsWith("data:") || /^https?:\/\//i.test(base64)) return base64;
  return `data:image/png;base64,${base64}`;
}

function extractQrBase64(data: ConnectQrResponse) {
  return data.qrcode ?? data.qrCode ?? data.base64;
}

function OnboardingNav({
  showVoltar,
  onVoltar,
  secondary,
  primary,
}: {
  showVoltar: boolean;
  onVoltar: () => void;
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  primary: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {showVoltar && (
        <Button type="button" variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
      )}
      <div className="ml-auto flex flex-wrap gap-2">
        {secondary && (
          <Button
            type="button"
            variant="outline"
            onClick={secondary.onClick}
            disabled={secondary.disabled}
          >
            {secondary.label}
          </Button>
        )}
        <Button
          type="button"
          onClick={primary.onClick}
          disabled={primary.disabled || primary.loading}
        >
          {primary.loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {primary.label}
            </>
          ) : (
            primary.label
          )}
        </Button>
      </div>
    </div>
  );
}

function QrLinkChip({ url }: { url: string }) {
  const copiar = () => {
    void navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
    >
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</span>
      <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function StepDots({ etapa, total }: { etapa: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const ativo = n === etapa;
        const concluido = n < etapa;
        return (
          <div
            key={n}
            className={`h-2 rounded-full transition-all ${
              ativo ? "w-6 bg-primary" : concluido ? "w-2 bg-primary/50" : "w-2 bg-muted-foreground/25"
            }`}
          />
        );
      })}
    </div>
  );
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { contaAtiva, refreshContas } = useConta();
  const productTour = useProductTourOptional();
  const contaInitedRef = useRef<string | null>(null);

  const [etapa, setEtapa] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDadosExtras, setLoadingDadosExtras] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [tamanhoEquipe, setTamanhoEquipe] = useState("");
  const [comoConheceu, setComoConheceu] = useState<OnboardingComoConheceu | "">("");
  const [nomeParceiro, setNomeParceiro] = useState("");
  const [estiloCampanha, setEstiloCampanha] = useState<EstiloCampanha | "">("");

  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [instanciaSelecionada, setInstanciaSelecionada] = useState("");
  const [nomeWhatsapp, setNomeWhatsapp] = useState("Atendimento principal");
  const [qrBase64, setQrBase64] = useState("");
  const [qrShareUrl, setQrShareUrl] = useState("");
  const [qrGerado, setQrGerado] = useState(false);
  const [carregandoQr, setCarregandoQr] = useState(false);

  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaToken, setMetaToken] = useState("");
  const [metaTestCode, setMetaTestCode] = useState("");
  const [metaConectado, setMetaConectado] = useState(false);

  const [campanhaNome, setCampanhaNome] = useState("");
  const [campanhaMensagem, setCampanhaMensagem] = useState("Olá! Quero saber mais sobre o atendimento.");
  const [criandoCampanha, setCriandoCampanha] = useState(false);
  const [fechado, setFechado] = useState(false);

  const loadDadosExtras = useCallback(async () => {
    if (!contaAtiva) return;
    setLoadingDadosExtras(true);
    const [instRes, metaRes] = await Promise.all([
      supabase
        .from("leads_instancias_whatsapp")
        .select(LEADS_INSTANCIA_COLUNAS)
        .eq("conta_id", contaAtiva.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("leads_config")
        .select("id, conta_id, meta_pixel_id, meta_conectado, meta_test_event_code, evento_padrao, updated_at")
        .eq("conta_id", contaAtiva.id)
        .maybeSingle(),
    ]);

    const instDb = (instRes.data as LeadsInstanciaWhatsapp[]) ?? [];
    setInstancias(instDb);
    setInstanciaSelecionada((prev) => {
      const id = prev || instDb[0]?.id || "";
      const inst = instDb.find((i) => i.id === id);
      if (inst) setNomeWhatsapp(inst.nome);
      return id;
    });
    const metaDb = (metaRes.data as LeadsConfig | null) ?? null;
    setMetaPixelId(metaDb?.meta_pixel_id ?? "");
    setMetaToken("");
    setMetaTestCode(metaDb?.meta_test_event_code ?? "");
    setMetaConectado(Boolean(metaDb?.meta_conectado));
    setLoadingDadosExtras(false);
  }, [contaAtiva]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!contaAtiva) return;
    if (contaInitedRef.current === contaAtiva.id) return;
    contaInitedRef.current = contaAtiva.id;

    setEtapa(Math.min(TOTAL_ETAPAS, Math.max(1, contaAtiva.onboarding_etapa_atual || 1)));
    setNomeEmpresa(isNomeEmpresaPlaceholder(contaAtiva.nome) ? "" : contaAtiva.nome ?? "");
    setTamanhoEquipe(contaAtiva.empresa_tamanho_funcionarios ?? "");
    const parsed = parseComoConheceu(contaAtiva.empresa_como_conheceu);
    setComoConheceu(parsed.valor);
    setNomeParceiro(parsed.nomeParceiro);
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

  const irParaEtapa = useCallback(
    async (nextStep: number) => {
      const next = Math.min(TOTAL_ETAPAS, Math.max(1, nextStep));
      setEtapa(next);
      await salvarConta({ onboarding_etapa_atual: next });
    },
    [salvarConta]
  );

  if (!contaAtiva) return null;

  const salvarEtapaEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEmpresa.trim() || !tamanhoEquipe || !comoConheceu) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (comoConheceu === "parceiros" && !nomeParceiro.trim()) {
      toast.error("Informe o nome do parceiro.");
      return;
    }
    setSubmitting(true);
    try {
      await salvarConta({
        nome: nomeEmpresa.trim(),
        empresa_tamanho_funcionarios: tamanhoEquipe,
        empresa_como_conheceu: formatComoConheceu(comoConheceu, nomeParceiro),
      });
      await irParaEtapa(2);
      toast.success("Informações salvas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  const salvarEtapaEstilo = async () => {
    if (!estiloCampanha) {
      toast.error("Selecione o tipo de campanha que você utiliza.");
      return;
    }
    setSubmitting(true);
    try {
      await salvarConta({ campanha_estilo_principal: estiloCampanha });
      await irParaEtapa(3);
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
      const nomeFinal = nomeWhatsapp.trim() || "Atendimento principal";
      if (!instanciaId) {
        const res = await apiPost<{ instancia: { id: string } }>(
          "/api/leads/criar-instancia",
          { nome: nomeFinal },
          contaAtiva.id
        );
        instanciaId = res.instancia.id;
        setInstanciaSelecionada(instanciaId);
        const instRes = await supabase
          .from("leads_instancias_whatsapp")
          .select(LEADS_INSTANCIA_COLUNAS)
          .eq("conta_id", contaAtiva.id)
          .order("created_at", { ascending: true });
        setInstancias((instRes.data as LeadsInstanciaWhatsapp[]) ?? []);
      } else {
        await supabase
          .from("leads_instancias_whatsapp")
          .update({ nome: nomeFinal, updated_at: new Date().toISOString() })
          .eq("id", instanciaId)
          .eq("conta_id", contaAtiva.id)
          .select(LEADS_INSTANCIA_COLUNAS);
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
      setQrGerado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar QR.");
    } finally {
      setCarregandoQr(false);
    }
  };

  const salvarMeta = async () => {
    if (!metaPixelId.trim() || (!metaToken.trim() && !metaConectado)) {
      toast.error("Preencha o Pixel ID e o Access Token para continuar.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(
        "/api/leads/salvar-config-meta",
        {
          metaPixelId: metaPixelId.trim(),
          ...(metaToken.trim() ? { metaAccessToken: metaToken.trim() } : {}),
          metaTestEventCode: metaTestCode.trim() || null,
        },
        contaAtiva.id
      );
      await irParaEtapa(6);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar integração Meta.");
    } finally {
      setSubmitting(false);
    }
  };

  const criarCampanha = async () => {
    if (!campanhaNome.trim() || !campanhaMensagem.trim()) {
      toast.error("Preencha os dados do link rastreável para continuar.");
      return;
    }
    const instanciaId = instanciaSelecionada || instancias[0]?.id;
    if (!instanciaId) {
      toast.error("Conecte um WhatsApp antes de criar o link rastreável.");
      return;
    }
    setCriandoCampanha(true);
    try {
      await apiPost(
        "/api/leads/criar-link",
        { nome: campanhaNome.trim(), instanciaId, mensagemInicial: campanhaMensagem.trim() },
        contaAtiva.id
      );
      await irParaEtapa(7);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar link rastreável.");
    } finally {
      setCriandoCampanha(false);
    }
  };

  const finalizarOnboarding = async (fazerTour: boolean) => {
    setFechado(true);
    setSubmitting(true);
    try {
      await salvarConta({
        onboarding_pendente: false,
        onboarding_etapa_atual: TOTAL_ETAPAS,
        onboarding_concluido_em: new Date().toISOString(),
      });
      navigate(`/app/${contaUrlRef(contaAtiva)}/dashboard`, { replace: true });
      if (fazerTour) {
        requestAnimationFrame(() => productTour?.startTour());
      }
    } catch (err) {
      setFechado(false);
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (fechado) return null;

  const tituloWizard = etapa >= 3 ? "Vamos configurar sua nova Viziom" : "Bem-vindo ao Viziom";
  const subtituloEtapa =
    etapa === 1
      ? "Conte-nos sobre sua empresa"
      : etapa === 2
        ? "Qual tipo de campanha você geralmente utiliza?"
        : etapa === 3
          ? "Primeiro precisamos conectar o WhatsApp"
          : etapa === 4
            ? "Jornada de vendas"
            : etapa === 5
              ? "Meta Ads"
              : etapa === 6
                ? "Primeiro link rastreável"
                : "Concluído";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-lg" aria-hidden />
      <Card
        className={`relative z-10 flex max-h-[min(92vh,820px)] w-full flex-col overflow-hidden border-border/80 shadow-2xl ${
          etapa === 4 ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <CardHeader className="shrink-0 space-y-4 border-b bg-card/95 pb-4">
          <StepDots etapa={etapa} total={TOTAL_ETAPAS} />
          <div className="space-y-1">
            <CardTitle className="text-lg sm:text-xl">{tituloWizard}</CardTitle>
            <CardDescription>
              Etapa {etapa} de {TOTAL_ETAPAS}
              {subtituloEtapa ? ` · ${subtituloEtapa}` : ""}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {etapa === 1 && (
            <form onSubmit={salvarEtapaEmpresa} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="nome-empresa">Nome da empresa</Label>
                <Input
                  id="nome-empresa"
                  value={nomeEmpresa}
                  onChange={(e) => setNomeEmpresa(e.target.value)}
                  placeholder="Ex.: Minha Empresa Ltda"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tamanho">Tamanho de funcionários</Label>
                <Select
                  id="tamanho"
                  value={tamanhoEquipe}
                  onChange={(e) => setTamanhoEquipe(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {ONBOARDING_TAMANHO_OPCOES.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="como-conheceu">Como nos conheceu?</Label>
                <Select
                  id="como-conheceu"
                  value={comoConheceu}
                  onChange={(e) => {
                    setComoConheceu(e.target.value as OnboardingComoConheceu | "");
                    if (e.target.value !== "parceiros") setNomeParceiro("");
                  }}
                >
                  <option value="">Selecione…</option>
                  {ONBOARDING_COMO_CONHECEU_OPCOES.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </Select>
              </div>
              {comoConheceu === "parceiros" && (
                <div className="space-y-2">
                  <Label htmlFor="nome-parceiro">Qual nome do parceiro?</Label>
                  <Input
                    id="nome-parceiro"
                    value={nomeParceiro}
                    onChange={(e) => setNomeParceiro(e.target.value)}
                    placeholder="Nome do parceiro"
                  />
                </div>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Salvando…" : "Continuar"}
              </Button>
            </form>
          )}

          {etapa === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Escolha o fluxo que mais se parece com o que você usa hoje. Isso nos ajuda a personalizar
                sua experiência.
              </p>
              <div className="grid gap-3">
                {ESTILO_CAMPANHA_OPCOES.map((opcao) => (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => setEstiloCampanha(opcao.id)}
                    className={`rounded-xl border-2 p-4 text-left text-sm transition-all ${
                      estiloCampanha === opcao.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {estiloCampanha === opcao.id ? (
                        <Check className="h-5 w-5 shrink-0 text-primary" />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="font-medium">{opcao.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <OnboardingNav
                showVoltar
                onVoltar={() => void irParaEtapa(1)}
                primary={{
                  label: "Continuar",
                  onClick: () => void salvarEtapaEstilo(),
                  disabled: submitting,
                  loading: submitting,
                }}
              />
            </div>
          )}

          {etapa === 3 && (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Primeiro precisamos conectar o WhatsApp. Gere o QR Code e escaneie no celular, ou
                compartilhe o link com quem for conectar.
              </p>
              {loadingDadosExtras ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {instancias.length > 1 && (
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Select
                        value={instanciaSelecionada}
                        onChange={(e) => {
                          const id = e.target.value;
                          setInstanciaSelecionada(id);
                          const inst = instancias.find((i) => i.id === id);
                          if (inst) setNomeWhatsapp(inst.nome);
                        }}
                      >
                        {instancias.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.nome}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="nome-whatsapp">Nome do WhatsApp</Label>
                    <Input
                      id="nome-whatsapp"
                      value={nomeWhatsapp}
                      onChange={(e) => setNomeWhatsapp(e.target.value)}
                      placeholder="Ex.: Atendimento principal"
                    />
                  </div>
                  <Button type="button" onClick={() => void gerarQrCode()} disabled={carregandoQr}>
                    {carregandoQr ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    Gerar QR Code
                  </Button>
                  {qrGerado && qrBase64 && (
                    <img
                      src={qrImageSrc(qrBase64)}
                      alt="QR Code do WhatsApp"
                      className="mx-auto max-w-[240px] rounded-xl border border-border bg-white p-2 shadow-sm"
                    />
                  )}
                  {qrGerado && qrShareUrl && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Caso não seja você que irá conectar o WhatsApp agora, copie o link abaixo e
                        clique em pular.
                      </p>
                      <QrLinkChip url={qrShareUrl} />
                    </div>
                  )}
                </>
              )}
              <OnboardingNav
                showVoltar
                onVoltar={() => void irParaEtapa(2)}
                secondary={{
                  label: "Conectar depois",
                  onClick: () => void irParaEtapa(4),
                }}
                primary={{
                  label: "Continuar",
                  onClick: () => void irParaEtapa(4),
                }}
              />
            </div>
          )}

          {etapa === 4 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Agora vamos configurar sua jornada de vendas</h3>
                <p className="text-sm text-muted-foreground">
                  Quais são as etapas de vendas que você gostaria de metrificar?
                </p>
                <p className="text-sm text-muted-foreground">
                  Adicione as etapas que deseja metrificar até a venda. O Viziom irá acompanhar e trazer
                  métricas sobre toda sua jornada de venda.
                </p>
              </div>
              <OnboardingJornadaStep
                contaId={contaAtiva.id}
                instancias={instancias}
                instanciaIdInicial={instanciaSelecionada || instancias[0]?.id}
              />
              <OnboardingNav
                showVoltar
                onVoltar={() => void irParaEtapa(3)}
                secondary={{
                  label: "Configurar depois",
                  onClick: () => void irParaEtapa(5),
                }}
                primary={{
                  label: "Continuar",
                  onClick: () => void irParaEtapa(5),
                }}
              />
            </div>
          )}

          {etapa === 5 && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <MetaLogoIcon className="mt-1 h-8 w-auto shrink-0" />
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">
                    Configure seu Pixel do Meta e API de Conversão
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O Viziom faz o trabalho completo: além de trazer métricas reais que fazem você tomar
                    decisões melhores, também envia eventos de conversão para o Meta Ads.
                  </p>
                </div>
              </div>
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label>Pixel ID</Label>
                  <Input value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Access Token (CAPI)</Label>
                  <Input
                    type="password"
                    value={metaToken}
                    onChange={(e) => setMetaToken(e.target.value)}
                    placeholder={
                      metaConectado
                        ? "Token já configurado — preencha só para substituir"
                        : undefined
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código de teste (opcional)</Label>
                  <Input
                    value={metaTestCode}
                    onChange={(e) => setMetaTestCode(e.target.value)}
                    placeholder="Test Events"
                  />
                </div>
              </div>
              <OnboardingNav
                showVoltar
                onVoltar={() => void irParaEtapa(4)}
                secondary={{
                  label: "Configurar depois",
                  onClick: () => void irParaEtapa(6),
                }}
                primary={{
                  label: "Continuar",
                  onClick: () => void salvarMeta(),
                  disabled: submitting,
                  loading: submitting,
                }}
              />
            </div>
          )}

          {etapa === 6 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-base font-semibold">
                  Agora vamos criar seu primeiro link rastreável para começar a rastrear seus leads e vendas
                </h3>
                <p className="text-sm text-muted-foreground">
                  Informe um nome e a mensagem inicial que o lead verá ao abrir o WhatsApp.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do link rastreável</Label>
                  <Input
                    value={campanhaNome}
                    onChange={(e) => setCampanhaNome(e.target.value)}
                    placeholder="Ex.: Meta Ads — Produto X"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem inicial no WhatsApp</Label>
                  <Textarea
                    value={campanhaMensagem}
                    onChange={(e) => setCampanhaMensagem(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <OnboardingNav
                showVoltar
                onVoltar={() => void irParaEtapa(5)}
                secondary={{
                  label: "Criar depois",
                  onClick: () => void irParaEtapa(7),
                }}
                primary={{
                  label: "Continuar",
                  onClick: () => void criarCampanha(),
                  disabled: criandoCampanha,
                  loading: criandoCampanha,
                }}
              />
            </div>
          )}

          {etapa >= 7 && (
            <div className="space-y-6 py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Meus parabéns, sua conta está configurada!</h3>
                <p className="text-sm text-muted-foreground">Deseja um tour por dentro do Viziom?</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void irParaEtapa(6)}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => void finalizarOnboarding(true)}
                  disabled={submitting}
                >
                  Fazer tour
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => void finalizarOnboarding(false)}
                  disabled={submitting}
                >
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

