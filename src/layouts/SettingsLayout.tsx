import { Navigate, NavLink, Outlet } from "react-router-dom";
import { Building2, CreditCard, Plug, User, Users } from "lucide-react";
import { useConta } from "@/contexts/ContaContext";
import { APP_ROUTES } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";

const tabs = [
  { to: `${APP_ROUTES.configuracoes}/perfil`, label: "Perfil", icon: User },
  { to: `${APP_ROUTES.configuracoes}/conta`, label: "Conta", icon: Building2 },
  { to: `${APP_ROUTES.configuracoes}/equipe`, label: "Equipe", icon: Users },
  { to: `${APP_ROUTES.configuracoes}/plano`, label: "Plano", icon: CreditCard },
  { to: `${APP_ROUTES.configuracoes}/integracoes`, label: "Integrações", icon: Plug },
];

export function SettingsLayout() {
  const { contaAtiva, loading, isAdmin } = useConta();

  if (loading) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }

  if (!contaAtiva) {
    return <Navigate to={APP_ROUTES.dashboard} replace />;
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
      {!isAdmin && (
        <p className="text-sm text-amber-700">
          Algumas opções exigem perfil admin da conta.
        </p>
      )}
      <Outlet />
    </div>
  );
}
