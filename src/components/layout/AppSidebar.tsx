import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shield, X } from "lucide-react";
import { useUsuario } from "@/contexts/UsuarioContext";
import { sidebarNavItems } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
            "flex h-14 shrink-0 items-center border-b border-sidebar-muted md:hidden",
            isCollapsedDesktop ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!isCollapsedDesktop && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
                V
              </div>
              <span className="font-semibold">Viziom</span>
            </div>
          )}
          <Button variant="ghost" size="icon" className="text-sidebar-foreground md:hidden" onClick={onCloseMobile}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          className={cn(
            "hidden border-b border-sidebar-muted py-5 md:block",
            isCollapsedDesktop ? "px-2 text-center" : "px-4"
          )}
        >
          <div className={cn("flex items-center gap-2", isCollapsedDesktop && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
              V
            </div>
            {!isCollapsedDesktop && (
              <div className="min-w-0">
                <span className="text-lg font-semibold">Viziom</span>
                <p className="text-xs text-sidebar-foreground/60">Rastreio WhatsApp</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {sidebarNavItems.map(({ to, label, icon: Icon, end }) => (
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
              to="/sys"
              title={isCollapsedDesktop ? "Admin Viziom" : undefined}
              onClick={onCloseMobile}
              className={cn(
                "mt-2 flex items-center rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-muted",
                isCollapsedDesktop ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!isCollapsedDesktop && <span>Admin Viziom</span>}
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
