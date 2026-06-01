import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Building2, CreditCard, Plug, User, Users } from "lucide-react";
import { useConta } from "@/contexts/ContaContext";
import { useAppRoutes } from "@/hooks/useAppRoutes";
import { cn } from "@/lib/utils";

export function SettingsLayout() {
  const { contaAtiva, loading } = useConta();
  const routes = useAppRoutes();

  const tabs = [
    { to: `${routes.configuracoes}/perfil`, label: "Perfil", icon: User },
    { to: `${routes.configuracoes}/conta`, label: "Conta", icon: Building2 },
    { to: `${routes.configuracoes}/equipe`, label: "Equipe", icon: Users },
    { to: `${routes.configuracoes}/plano`, label: "Plano", icon: CreditCard },
    { to: `${routes.configuracoes}/integracoes`, label: "Meta Pixel", icon: Plug },
  ];

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  if (!contaAtiva) {
    return <Navigate to={routes.dashboard} replace />;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{contaAtiva.nome}</p>
      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex shrink-0 items-center gap-2 rounded-t-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-b-2 border-primary bg-primary/5 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
