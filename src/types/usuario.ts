export interface Usuario {
  id: string;
  email: string;
  nome: string | null;
  foto_url: string | null;
  superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export type PlanoRecorrencia = "mensal" | "trimestral" | "semestral" | "anual";

export interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: number;
  recorrencia: PlanoRecorrencia;
  max_whatsapps: number | null;
  max_leads: number | null;
  max_usuarios: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FeedbackTipo = "bug" | "sugestao" | "melhoria";
export type FeedbackUrgencia = "normal" | "urgente";
export type FeedbackStatus = "aberto" | "em_analise" | "resolvido" | "fechado";

export interface ErroCapturado {
  mensagem: string;
  origem?: string;
  timestamp: string;
}

export interface FeedbackContexto {
  pagina: string;
  rota: string;
  conta: string;
  usuario: string;
  email: string;
  papel: string | null;
  dataHora: string;
  navegador: string;
  resolucao: string;
  urlCompleta: string;
  erros?: ErroCapturado[];
}

export interface FeedbackAnexo {
  nome: string;
  path: string;
  tipo: string;
  tamanho: number;
}

export interface Feedback {
  id: string;
  conta_id: string | null;
  usuario_id: string;
  tipo: FeedbackTipo;
  urgencia: FeedbackUrgencia;
  titulo: string;
  descricao: string;
  contexto: FeedbackContexto | null;
  screenshot_path: string | null;
  anexos: FeedbackAnexo[];
  status: FeedbackStatus;
  resposta: string | null;
  resolvido_por: string | null;
  resolvido_em: string | null;
  created_at: string;
  updated_at: string;
  usuarios?: Usuario | null;
  contas?: { id: string; nome: string } | null;
}

export interface SystemLog {
  id: string;
  tipo: string;
  nivel: "info" | "sucesso" | "erro" | "aviso";
  mensagem: string;
  detalhes: Record<string, unknown> | null;
  usuario_id: string | null;
  conta_id: string | null;
  created_at: string;
}
