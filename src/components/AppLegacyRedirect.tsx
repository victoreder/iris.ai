import { Navigate, useLocation } from "react-router-dom";
import { useConta } from "@/contexts/ContaContext";
import { contaUrlRef } from "@/lib/appNavigation";
import { useUsuario } from "@/contexts/UsuarioContext";

/** Redireciona rotas /app/* sem ID de conta para /app/:numero/* */
const LEGACY_PATH_ALIASES: Record<string, string> = {
  "/campanhas": "/links-rastreaveis",
  "/campaigns": "/links-rastreaveis",
};

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

  let suffix = pathname.slice("/app".length) || "/dashboard";
  suffix = LEGACY_PATH_ALIASES[suffix] ?? suffix;
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
