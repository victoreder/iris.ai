import { META_PIXEL_CONFIG_HASH } from "@/components/layout/MetaPixelHeaderStatus";
import type { AppRoutes } from "@/lib/appNavigation";

export const PRODUCT_TOUR_SELECTORS = {
  profileWhatsapp: '[data-tour="profile-whatsapp"]',
  whatsappCreate: '[data-tour="whatsapp-create"]',
  whatsappQr: '[data-tour="whatsapp-qr"]',
  whatsappQrPanel: '[data-tour="whatsapp-qr-panel"]',
  campaignCreate: '[data-tour="campaign-create"]',
  metaPixelConfig: '[data-tour="meta-pixel-config"]',
  journeyFunnel: '[data-tour="journey-funnel"]',
  journeyNewStage: '[data-tour="journey-new-stage"]',
  journeyEditStage: '[data-tour="journey-edit-stage"]',
  leadsInbox: '[data-tour="leads-inbox"]',
  dashboardKpis: '[data-tour="dashboard-kpis"]',
} as const;

export const TOUR_STEP = {
  PROFILE: 0,
  WHATSAPP: 1,
  CAMPAIGN: 2,
  META: 3,
  JOURNEY_FUNNEL: 4,
  JOURNEY_NEW: 5,
  JOURNEY_EDIT: 6,
  LEADS: 7,
  DASHBOARD: 8,
} as const;

export const TOUR_STEP_COUNT = 9;

export type TourStepId = (typeof TOUR_STEP)[keyof typeof TOUR_STEP];

export type TourStepContent = {
  title: string;
  description: string;
  primaryLabel: string;
};

export function metaIntegrationsPath(routes: AppRoutes): string {
  return `${routes.configuracoes}/integracoes#${META_PIXEL_CONFIG_HASH}`;
}

export const TOUR_STEP_CONTENT: Record<TourStepId, TourStepContent> = {
  [TOUR_STEP.PROFILE]: {
    title: "Conecte seus WhatsApps",
    description:
      "Aqui você acessa os números de WhatsApp que o Viziom vai rastrear. É o primeiro passo para capturar conversas, etapas da jornada e conversões.",
    primaryLabel: "Ir para WhatsApps",
  },
  [TOUR_STEP.WHATSAPP]: {
    title: "Conecte seu WhatsApp",
    description:
      "Clique no ícone de QR Code na tabela (ou crie uma instância) para gerar o código. O Viziom usa essa conexão para rastrear conversas e leads.",
    primaryLabel: "Entendi, continuar",
  },
  [TOUR_STEP.CAMPAIGN]: {
    title: "Crie sua primeira campanha",
    description:
      "Cada campanha gera links rastreáveis para anúncios, site ou WhatsApp. Você define nome, número receptor e mensagem inicial — assim o Viziom sabe de qual campanha veio cada lead e cada venda.",
    primaryLabel: "Ir para integração Meta",
  },
  [TOUR_STEP.META]: {
    title: "Configure o Pixel da Meta",
    description:
      "Informe o Pixel ID e o Access Token da API de Conversões (CAPI). O Viziom envia eventos quando seus leads avançam na jornada, para otimizar campanhas na Meta.",
    primaryLabel: "Ir para jornada de vendas",
  },
  [TOUR_STEP.JOURNEY_FUNNEL]: {
    title: "Sua jornada de vendas",
    description:
      "Aqui você monta o funil que o Viziom usa para metrificar cada lead. A etapa Contato inicial já existe ao conectar o WhatsApp — é a primeira mensagem do lead.",
    primaryLabel: "Próximo",
  },
  [TOUR_STEP.JOURNEY_NEW]: {
    title: "Adicione etapas que importam",
    description:
      "Clique em Nova etapa para criar fases do seu processo (proposta, negociação, venda). Em cada etapa você pode usar palavras-chave no WhatsApp e enviar eventos para a Meta.",
    primaryLabel: "Próximo",
  },
  [TOUR_STEP.JOURNEY_EDIT]: {
    title: "Edite quando quiser",
    description:
      "Clique em uma etapa do funil para editar nome, palavras-chave, evento Meta e se representa venda (com valor). O Viziom move o lead automaticamente ao detectar as palavras-chave.",
    primaryLabel: "Ir para Leads",
  },
  [TOUR_STEP.LEADS]: {
    title: "Onde seus leads aparecem",
    description:
      "Todos os contatos que passarem pelos seus links e campanhas aparecem aqui. Ao abrir um lead, você vê mensagens, origens, etapa da jornada e valor de venda quando aplicável.",
    primaryLabel: "Ver métricas no dashboard",
  },
  [TOUR_STEP.DASHBOARD]: {
    title: "Métricas da sua empresa",
    description:
      "Acompanhe leads, vendas, receita estimada, funil e campanhas que mais convertem. Use filtros por data, WhatsApp e UTM para analisar cada canal.",
    primaryLabel: "Concluir tour",
  },
};

export const TOUR_WHATSAPP_QR_CONTENT: TourStepContent = {
  title: "Escaneie ou compartilhe o link",
  description:
    "Você: WhatsApp no celular → Aparelhos conectados → escaneie o QR Code. Outra pessoa: copie o link abaixo e envie — ela abre no celular e escaneia sem entrar no Viziom.",
  primaryLabel: "Entendi, continuar",
};
