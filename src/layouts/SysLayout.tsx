import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Building2, CreditCard, LayoutDashboard, LogOut, MessageSquare, ScrollText, UserCircle, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { Button } from "@/components/ui/button";
import { SidebarLogo } from "@/components/layout/SidebarLogo";
import { cn } from "@/lib/utils";
import { getPageTitle } from "@/lib/appNavigation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isImpersonating } from "@/lib/impersonate";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/contas", label: "Contas", icon: Building2 },
  { to: "/admin/usuarios", label: "Usuários", icon: UserCircle },
  { to: "/admin/plans", label: "Planos", icon: CreditCard },
  { to: "/admin/feedback", label: "Bugs e sugestões", icon: MessageSquare },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
];

export function SysLayout() {
  const { signOut } = useAuth();
  const { loading, isSuperadmin } = useUsuario();
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);
  useDocumentTitle(pageTitle);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!isSuperadmin) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className={cn("flex min-h-screen bg-background", isImpersonating() && "pt-10")}>
      <aside className="flex w-60 flex-col bg-sidebar text-sidebar-foreground">
        <div className="shrink-0 border-b border-sidebar-muted px-3 pb-2 pt-[50px]">
          <SidebarLogo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  isActive ? "bg-primary text-white" : "hover:bg-sidebar-muted"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/app"
            className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-muted"
          >
            <Users className="h-4 w-4" />
            Ir para o app
          </NavLink>
        </nav>
        <div className="border-t border-sidebar-muted p-3">
          <Button variant="sidebar" className="w-full justify-start" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </header>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
