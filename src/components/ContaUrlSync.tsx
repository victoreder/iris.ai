import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useConta } from "@/contexts/ContaContext";
import { contaUrlRef, resolveContaFromUrlRef } from "@/lib/appNavigation";

/** Sincroniza :contaId da URL com a conta ativa e redireciona se o usuário não tiver acesso. */
export function ContaUrlSync() {
  const { contaId } = useParams<{ contaId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { contas, contaAtiva, loading, setContaAtiva } = useConta();

  useEffect(() => {
    if (loading || !contaId) return;

    const matched = resolveContaFromUrlRef(contaId, contas);
    if (matched) {
      if (contaAtiva?.id !== matched.id) {
        setContaAtiva(matched);
      }
      return;
    }

    const fallback = contaAtiva ?? contas[0];
    if (!fallback) return;

    const suffix = location.pathname.replace(/^\/app\/[^/]+/, "") || "/dashboard";
    navigate(
      `/app/${contaUrlRef(fallback)}${suffix}${location.search}${location.hash}`,
      { replace: true }
    );
  }, [
    contaId,
    contas,
    contaAtiva,
    loading,
    location.pathname,
    location.search,
    location.hash,
    navigate,
    setContaAtiva,
  ]);

  return null;
}
