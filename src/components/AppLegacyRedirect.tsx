import { Navigate, useLocation } from "react-router-dom";
import { useConta } from "@/contexts/ContaContext";
import { contaUrlRef } from "@/lib/appNavigation";
import { useUsuario } from "@/contexts/UsuarioContext";

/** Redireciona rotas /app/* sem ID de conta para /app/:numero/* */
export function AppLegacyRedirect() {
  const { pathname, search, hash } = useLocation();
  const { contas, contaAtiva, loading } = useConta();
  const { isSuperadmin } = useUsuario();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const conta = contaAtiva ?? contas[0];
  if (!conta) {
    if (isSuperadmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  const suffix = pathname.slice("/app".length) || "/dashboard";
  return <Navigate to={`/app/${contaUrlRef(conta)}${suffix}${search}${hash}`} replace />;
}

/** Redireciona /app para o dashboard da conta ativa. */
export function AppRootRedirect() {
  const { contas, contaAtiva, loading } = useConta();
  const { isSuperadmin } = useUsuario();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const conta = contaAtiva ?? contas[0];
  if (!conta) {
    if (isSuperadmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/app/${contaUrlRef(conta)}/dashboard`} replace />;
}
