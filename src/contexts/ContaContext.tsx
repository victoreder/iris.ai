import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  canDeleteConta,
  canWriteConta,
  isViewerConta,
} from "@/lib/contaPermissions";
import type { Conta, ContaMembro, ContaPapel } from "@/types/database";

const STORAGE_KEY = "viziom_conta_ativa";

interface ContaContextValue {
  contas: Conta[];
  membros: ContaMembro[];
  contaAtiva: Conta | null;
  papelAtivo: ContaPapel | null;
  loading: boolean;
  loadError: string | null;
  setContaAtiva: (conta: Conta) => void;
  refreshContas: () => Promise<void>;
  /** Criar e editar (admin + membro). */
  canWrite: boolean;
  /** Excluir recursos da conta (somente admin). */
  canDelete: boolean;
  /** Admin da conta. */
  isAdmin: boolean;
  /** Perfil visualizador — somente leitura. */
  isViewer: boolean;
}

const ContaContext = createContext<ContaContextValue | null>(null);

export function ContaProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [contas, setContas] = useState<Conta[]>([]);
  const [membros, setMembros] = useState<ContaMembro[]>([]);
  const [contaAtiva, setContaAtivaState] = useState<Conta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const refreshContas = useCallback(async () => {
    if (authLoading) return;

    if (!userId) {
      setContas([]);
      setMembros([]);
      setContaAtivaState(null);
      setLoadError(null);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      return;
    }

    const isNewUser = lastFetchedUserIdRef.current !== userId;
    if (isNewUser) setLoading(true);

    const { data: membrosData, error } = await supabase
      .from("conta_membros")
      .select("*, contas(*)")
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    setLoadError(null);

    const rows = (membrosData ?? []) as ContaMembro[];
    setMembros(rows);
    const lista = rows.map((m) => m.contas!).filter(Boolean) as Conta[];
    setContas(lista);

    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = lista.find((c) => c.id === savedId);
    setContaAtivaState((prev) => {
      if (saved) return saved;
      if (prev && lista.some((c) => c.id === prev.id)) return prev;
      return lista[0] ?? null;
    });

    lastFetchedUserIdRef.current = userId;
    setLoading(false);
  }, [userId, authLoading]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    void refreshContas();
  }, [authLoading, userId, refreshContas]);

  const setContaAtiva = useCallback((conta: Conta) => {
    localStorage.setItem(STORAGE_KEY, conta.id);
    setContaAtivaState(conta);
  }, []);

  const papelAtivo = useMemo(() => {
    if (!contaAtiva) return null;
    return membros.find((m) => m.conta_id === contaAtiva.id)?.papel ?? null;
  }, [contaAtiva, membros]);

  const canWrite = canWriteConta(papelAtivo);
  const canDelete = canDeleteConta(papelAtivo);
  const isAdmin = papelAtivo === "admin";
  const isViewer = isViewerConta(papelAtivo);

  const value = useMemo(
    () => ({
      contas,
      membros,
      contaAtiva,
      papelAtivo,
      loading: authLoading || loading,
      loadError,
      setContaAtiva,
      refreshContas,
      canWrite,
      canDelete,
      isAdmin,
      isViewer,
    }),
    [
      contas,
      membros,
      contaAtiva,
      papelAtivo,
      authLoading,
      loading,
      loadError,
      setContaAtiva,
      refreshContas,
      canWrite,
      canDelete,
      isAdmin,
      isViewer,
    ]
  );

  return <ContaContext.Provider value={value}>{children}</ContaContext.Provider>;
}

export function useConta() {
  const ctx = useContext(ContaContext);
  if (!ctx) throw new Error("useConta deve ser usado dentro de ContaProvider");
  return ctx;
}
