import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shield, X } from "lucide-react";
import { useUsuario } from "@/contexts/UsuarioContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { useMetaConnectionStatus } from "@/hooks/useMetaConnectionStatus";
import { sidebarNavItems } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SidebarLogo } from "@/components/layout/SidebarLogo";

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
}

export function AppSidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: AppSidebarProps) {
  const { isSuperadmin } = useUsuario();
  const routes = useAppRoutes();
  const { connected: metaConnected } = useMetaConnectionStatus();
  const navItems = sidebarNavItems(routes, metaConnected);
  const isCollapsedDesktop = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Fechar menu"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200 md:sticky md:top-0 md:z-auto md:h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsedDesktop ? "w-[4.5rem]" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-sidebar-muted pt-[30px] md:hidden",
            isCollapsedDesktop ? "justify-center px-2 pb-2" : "justify-between gap-2 px-3 pb-2"
          )}
        >
          {!isCollapsedDesktop && (
            <div className="min-w-0 flex-1">
              <SidebarLogo />
            </div>
          )}
          {isCollapsedDesktop && <SidebarLogo />}
          <Button variant="ghost" size="icon" className="text-sidebar-foreground md:hidden" onClick={onCloseMobile}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          className={cn(
            "hidden shrink-0 border-b border-sidebar-muted pt-[30px] md:block",
            isCollapsedDesktop ? "px-2 pb-2" : "px-3 pb-2"
          )}
        >
          <SidebarLogo />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={isCollapsedDesktop ? label : undefined}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md text-sm transition-colors",
                  isCollapsedDesktop ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop && <span>{label}</span>}
            </NavLink>
          ))}

          {isSuperadmin && (
            <NavLink
              to="/admin"
              title={isCollapsedDesktop ? "Admin" : undefined}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  "mt-3 flex items-center rounded-md border text-sm font-medium transition-colors",
                  isCollapsedDesktop ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                  isActive
                    ? "border-amber-400/70 bg-amber-500/25 text-amber-50"
                    : "border-amber-500/35 bg-amber-500/10 text-amber-200/90 hover:border-amber-400/55 hover:bg-amber-500/20"
                )
              }
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop && <span>Admin</span>}
            </NavLink>
          )}
        </nav>

        <div className="hidden border-t border-sidebar-muted p-2 md:block">
          <Button
            variant="sidebar"
            size={isCollapsedDesktop ? "icon" : "default"}
            className={cn("w-full", !isCollapsedDesktop && "justify-start")}
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!isCollapsedDesktop && <span>Recolher</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
