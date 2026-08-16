export type ContaPapel = "admin" | "membro" | "visualizador";

export type StatusLeadsInstancia = "pendente" | "conectando" | "conectado" | "desconectado";
export type StatusLeadClique = "aguardando" | "convertido" | "expirado";
export type LeadsLogTipo = "clique" | "webhook" | "meta";
export type LeadsLogNivel = "info" | "sucesso" | "erro" | "aviso";

export interface Conta {
  id: string;
  numero: number;
  nome: string;
  slug: string;
  plano_id: string | null;
  status: "ativa" | "suspensa" | "cancelada";
  email_contato: string | null;
  telefone: string | null;
  onboarding_pendente: boolean;
  onboarding_etapa_atual: number;
  onboarding_concluido_em: string | null;
  empresa_tamanho_funcionarios: string | null;
  empresa_como_conheceu: string | null;
  campanha_estilo_principal: string | null;
  data_vencimento: string | null;
  lembrete_vencimento_para?: string | null;
  created_at: string;
  updated_at: string;
  planos?: import("./usuario").Plano;
}

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
}

export interface ContaMembro {
  id: string;
  conta_id: string;
  user_id: string;
  papel: ContaPapel;
  created_at: string;
  contas?: Conta;
}

export interface LeadsConfig {
  id: string;
  conta_id: string;
  meta_pixel_id: string | null;
  meta_access_token?: string | null;
  meta_conectado?: boolean;
  meta_test_event_code: string | null;
  evento_padrao: string;
  updated_at: string;
}

export const LEADS_INSTANCIA_COLUNAS =
  "id, conta_id, nome, instance_name, telefone, status, webhook_configurado, webhook_erro, created_at, updated_at, id_externo";

export interface LeadsInstanciaWhatsapp {
  id: string;
  conta_id: string;
  nome: string;
  instance_name: string;
  telefone: string | null;
  status: StatusLeadsInstancia;
  webhook_configurado: boolean;
  webhook_erro: string | null;
  created_at: string;
  updated_at: string;
  token_instancia?: string | null;
  id_externo?: string | null;
}

export interface LeadsLink {
  id: string;
  conta_id: string;
  nome: string;
  slug: string;
  instancia_id: string;
  mensagem_inicial: string;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
}

export interface LeadsJornadaEtapa {
  id: string;
  conta_id: string;
  instancia_id: string;
  nome: string;
  posicao: number;
  palavras_chave: string[];
  evento_meta: string;
  primeiro_contato: boolean;
  representa_venda: boolean;
  valor_venda: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeadsClique {
  id: string;
  conta_id: string;
  link_id: string | null;
  instancia_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landing_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  fbp: string | null;
  fbc: string | null;
  status: StatusLeadClique;
  telefone_lead: string | null;
  mensagem_recebida: string | null;
  convertido_at: string | null;
  meta_enviado: boolean;
  meta_event_id: string | null;
  meta_erro: string | null;
  meta_enviado_at: string | null;
  etapa_id: string | null;
  etapa_atualizada_at: string | null;
  valor_venda: number | null;
  clique_principal_id: string | null;
  observacao: string | null;
  data_follow_up: string | null;
  data_reuniao: string | null;
  responsavel_id: string | null;
  created_at: string;
  leads_links?: Pick<LeadsLink, "id" | "nome" | "slug" | "instancia_id"> | null;
  leads_jornada_etapas?: Pick<LeadsJornadaEtapa, "id" | "nome" | "representa_venda" | "valor_venda"> | null;
  responsavel?: Pick<import("./usuario").Usuario, "id" | "nome" | "email" | "foto_url"> | null;
}

export interface LeadsCliqueFollowUp {
  id: string;
  conta_id: string;
  clique_id: string;
  data_follow_up: string;
  observacao: string | null;
  concluido: boolean;
  concluido_at: string | null;
  created_at: string;
}

export type LeadsCliqueEventoTipo =
  | "lead_novo"
  | "etapa_alterada"
  | "meta_enviado"
  | "valor_venda_alterado"
  | "origem_adicional";

export interface LeadsCliqueOrigem {
  id: string;
  conta_id: string;
  clique_id: string;
  ordem: number;
  origem_clique_id: string | null;
  link_id: string | null;
  instancia_id: string | null;
  campanha_nome: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landing_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  fbp: string | null;
  fbc: string | null;
  registrado_em: string;
}

export interface LeadsCliqueEvento {
  id: string;
  conta_id: string;
  clique_id: string;
  tipo: LeadsCliqueEventoTipo;
  etapa_id: string | null;
  etapa_nome: string | null;
  etapa_anterior_id: string | null;
  etapa_anterior_nome: string | null;
  evento_meta: string | null;
  meta_enviado: boolean | null;
  meta_erro: string | null;
  detalhes: Record<string, unknown> | null;
  created_at: string;
  leads_cliques?: Pick<LeadsClique, "telefone_lead"> | null;
}

export type LeadsCliqueMensagemTipo =
  | "texto"
  | "imagem"
  | "video"
  | "audio"
  | "documento"
  | "sticker"
  | "contato"
  | "localizacao"
  | "outro";

export interface LeadsCliqueMensagem {
  id: string;
  conta_id: string;
  clique_id: string;
  instancia_id: string | null;
  from_me: boolean;
  texto: string | null;
  tipo: LeadsCliqueMensagemTipo;
  message_id: string | null;
  remote_jid: string | null;
  media_url: string | null;
  media_mime: string | null;
  media_nome: string | null;
  disparou_etapa: boolean;
  etapa_nome: string | null;
  etapa_representa_venda: boolean;
  mensagem_em: string;
  created_at: string;
}

export interface LeadsLog {
  id: string;
  conta_id: string | null;
  tipo: LeadsLogTipo;
  nivel: LeadsLogNivel;
  mensagem: string;
  detalhes: Record<string, unknown> | null;
  clique_id: string | null;
  link_id: string | null;
  instance_name: string | null;
  created_at: string;
}
