import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { isInviteFlowPending } from "@/lib/authInvite";
import { NoAccessPage } from "@/pages/NoAccessPage";
import { ContaSuspensaPage } from "@/pages/ContaSuspensaPage";

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { loading: usuarioLoading, isProvisioned } = useUsuario();
  const { loading: contaLoading } = useConta();

  if (authLoading || usuarioLoading || contaLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (isInviteFlowPending()) {
    return <Navigate to="/auth/convite" replace />;
  }

  if (!isProvisioned) {
    return <NoAccessPage />;
  }

  return <>{children}</>;
}

export function AppLayoutGuard() {
  const { contaAtiva, loading } = useConta();
  const { isSuperadmin } = useUsuario();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!contaAtiva) {
    if (isSuperadmin) return <Navigate to="/admin" replace />;
    return <NoAccessPage />;
  }

  if (contaAtiva.status === "suspensa" && !isSuperadmin) {
    return <ContaSuspensaPage />;
  }

  return <Outlet />;
}
