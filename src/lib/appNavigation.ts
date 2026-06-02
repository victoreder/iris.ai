import {
  Activity,
  BarChart3,
  GitBranch,
  Link2,
  Megaphone,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Conta } from "@/types/database";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function contaUrlRef(conta: Pick<Conta, "numero" | "id">): string {
  return String(conta.numero ?? conta.id);
}

export function resolveContaFromUrlRef(ref: string, contas: Conta[]): Conta | null {
  if (/^\d+$/.test(ref)) {
    const numero = Number(ref);
    return contas.find((c) => c.numero === numero) ?? null;
  }
  if (UUID_RE.test(ref)) {
    return contas.find((c) => c.id === ref) ?? null;
  }
  return null;
}

export function appRoutes(contaRef: string | null) {
  const base = contaRef ? `/app/${contaRef}` : "/app";
  return {
    dashboard: `${base}/dashboard`,
    leads: `${base}/leads`,
    linksRastreaveis: `${base}/links-rastreaveis`,
    campanhasMensagem: `${base}/campanhas-mensagem`,
    jornada: `${base}/jornada`,
    atividade: `${base}/atividade`,
    whatsapp: `${base}/whatsapp`,
    configuracoes: `${base}/configuracoes`,
  } as const;
}

export type AppRoutes = ReturnType<typeof appRoutes>;

export interface AppNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export function sidebarNavItems(routes: AppRoutes, metaConnected = false): AppNavItem[] {
  const items: AppNavItem[] = [
    { to: routes.dashboard, label: "Dashboard", icon: BarChart3, end: true },
    { to: routes.leads, label: "Leads", icon: Users },
    { to: routes.linksRastreaveis, label: "Links rastreáveis", icon: Link2 },
  ];

  if (metaConnected) {
    items.push({
      to: routes.campanhasMensagem,
      label: "Campanhas de Mensagem",
      icon: Megaphone,
    });
  }

  items.push(
    { to: routes.jornada, label: "Jornada de compra", icon: GitBranch },
    { to: routes.atividade, label: "Atividade", icon: Activity }
  );

  return items;
}

export function replaceContaInPath(pathname: string, newContaRef: string): string {
  if (/^\/app\/[^/]+/.test(pathname)) {
    return pathname.replace(/^\/app\/[^/]+/, `/app/${newContaRef}`);
  }
  return `/app/${newContaRef}/dashboard`;
}

/** Remove o segmento da conta para comparar títulos e rotas legadas. */
export function normalizeAppPathname(pathname: string): string {
  return pathname.replace(/^\/app\/[^/]+/, "/app");
}

const pageTitles: Record<string, string> = {
  "/app/dashboard": "Dashboard",
  "/app/leads": "Leads",
  "/app/links-rastreaveis": "Links rastreáveis",
  "/app/campanhas-mensagem": "Campanhas de Mensagem",
  "/app/jornada": "Jornada de compra",
  "/app/atividade": "Atividade",
  "/app/whatsapp": "WhatsApps",
  "/app/configuracoes/perfil": "Perfil",
  "/app/configuracoes/conta": "Conta",
  "/app/configuracoes/equipe": "Equipe",
  "/app/configuracoes/plano": "Plano",
  "/app/configuracoes/conectar-meta": "Conectar Meta",
  "/app/configuracoes/integracoes": "Meta Pixel",
};

const adminPageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/contas": "Contas",
  "/admin/usuarios": "Usuários",
  "/admin/plans": "Planos",
  "/admin/feedback": "Bugs e sugestões",
  "/admin/logs": "Logs",
};

export function getPageTitle(pathname: string): string {
  const normalized = normalizeAppPathname(pathname);
  const legacyAliases: Record<string, string> = {
    "/app/campanhas": "/app/links-rastreaveis",
    "/app/campaigns": "/app/links-rastreaveis",
  };
  const resolved = legacyAliases[normalized] ?? normalized;
  if (pageTitles[resolved]) return pageTitles[resolved];
  if (adminPageTitles[pathname]) return adminPageTitles[pathname];
  if (/^\/app\/leads\/[^/]+$/.test(normalized)) return "Lead";
  if (normalized.startsWith("/app/configuracoes")) return "Configurações";
  if (pathname.startsWith("/admin")) return "Admin";
  return "Viziom";
}
