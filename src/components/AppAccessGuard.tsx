import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useConta } from "@/contexts/ContaContext";
import { useUsuario } from "@/contexts/UsuarioContext";
import { isInviteFlowPending } from "@/lib/authInvite";
import { NoAccessPage } from "@/pages/NoAccessPage";
import { ContaSuspensaPage } from "@/pages/ContaSuspensaPage";

export function AppAccessGuard({ children }: { children: React.ReactNode }) {
  const { loading: authLoading } = useAuth();
  const { loading: usuarioLoading, isProvisioned, loadError: usuarioError, refreshUsuario } =
    useUsuario();
  const { loading: contaLoading, loadError: contaError, refreshContas } = useConta();

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

  if (usuarioError || contaError) {
    return (
      <NoAccessPage
        title="Não foi possível carregar o acesso"
        description="O login funcionou, mas a verificação da sua conta falhou. Tente novamente."
        detail={usuarioError ?? contaError}
        onRetry={() => {
          void refreshUsuario();
          void refreshContas();
        }}
      />
    );
  }

  if (!isProvisioned) {
    return <NoAccessPage />;
  }

  return <>{children}</>;
}

export function AppLayoutGuard() {
  const { contaAtiva, loading, loadError, refreshContas } = useConta();
  const { isSuperadmin, usuario } = useUsuario();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <NoAccessPage
        title="Não foi possível carregar a empresa"
        description="O login funcionou, mas as contas vinculadas não puderam ser lidas."
        detail={loadError}
        onRetry={() => void refreshContas()}
      />
    );
  }

  if (!contaAtiva) {
    if (isSuperadmin) return <Navigate to="/admin" replace />;
    return (
      <NoAccessPage
        title="Nenhuma empresa vinculada"
        description={
          <>
            O usuário <strong>{usuario?.email}</strong> está provisionado, mas não pertence a nenhuma
            conta.
          </>
        }
        detail="Peça a um administrador para adicionar este e-mail em Equipe."
      />
    );
  }

  if (contaAtiva.status === "suspensa" && !isSuperadmin) {
    return <ContaSuspensaPage />;
  }

  return <Outlet />;
}
