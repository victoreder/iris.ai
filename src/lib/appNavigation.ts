import {
  Activity,
  BarChart3,
  GitBranch,
  Link2,
  Users,
  type LucideIcon,
} from "lucide-react";

export const APP_ROUTES = {
  dashboard: "/app/dashboard",
  leads: "/app/leads",
  campanhas: "/app/campanhas",
  jornada: "/app/jornada",
  atividade: "/app/atividade",
  whatsapp: "/app/whatsapp",
  configuracoes: "/app/configuracoes",
} as const;

export interface AppNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const sidebarNavItems: AppNavItem[] = [
  { to: APP_ROUTES.dashboard, label: "Dashboard", icon: BarChart3, end: true },
  { to: APP_ROUTES.leads, label: "Leads", icon: Users },
  { to: APP_ROUTES.campanhas, label: "Campanhas", icon: Link2 },
  { to: APP_ROUTES.jornada, label: "Jornada de compra", icon: GitBranch },
  { to: APP_ROUTES.atividade, label: "Atividade", icon: Activity },
];

const pageTitles: Record<string, string> = {
  [APP_ROUTES.dashboard]: "Dashboard",
  [APP_ROUTES.leads]: "Leads",
  [APP_ROUTES.campanhas]: "Campanhas",
  [APP_ROUTES.jornada]: "Jornada de compra",
  [APP_ROUTES.atividade]: "Atividade",
  [APP_ROUTES.whatsapp]: "WhatsApps",
  [`${APP_ROUTES.configuracoes}/perfil`]: "Configurações",
  [`${APP_ROUTES.configuracoes}/conta`]: "Configurações",
  [`${APP_ROUTES.configuracoes}/equipe`]: "Configurações",
  [`${APP_ROUTES.configuracoes}/plano`]: "Configurações",
  [`${APP_ROUTES.configuracoes}/integracoes`]: "Configurações",
};

export function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith(APP_ROUTES.configuracoes)) return "Configurações";
  return "Viziom";
}
