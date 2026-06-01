import { Navigate } from "react-router-dom";
import { useConta } from "@/contexts/ContaContext";
import { contaUrlRef } from "@/lib/appNavigation";

/** Rota legada: redireciona para o dashboard com overlay de onboarding. */
export function OnboardingPage() {
  const { contaAtiva, loading } = useConta();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!contaAtiva) return <Navigate to="/app" replace />;

  return <Navigate to={`/app/${contaUrlRef(contaAtiva)}/dashboard`} replace />;
}
