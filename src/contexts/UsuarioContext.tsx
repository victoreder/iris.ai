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
import type { Usuario } from "@/types/usuario";

interface UsuarioContextValue {
  usuario: Usuario | null;
  loading: boolean;
  refreshUsuario: () => Promise<void>;
  isSuperadmin: boolean;
  isProvisioned: boolean;
}

const UsuarioContext = createContext<UsuarioContextValue | null>(null);

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const refreshUsuario = useCallback(async () => {
    if (authLoading) return;

    if (!userId) {
      setUsuario(null);
      setLoading(false);
      lastFetchedUserIdRef.current = null;
      return;
    }

    const isNewUser = lastFetchedUserIdRef.current !== userId;
    if (isNewUser) setLoading(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) console.error(error);
    setUsuario((data as Usuario) ?? null);
    lastFetchedUserIdRef.current = userId;
    setLoading(false);
  }, [userId, authLoading]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    void refreshUsuario();
  }, [authLoading, userId, refreshUsuario]);

  const value = useMemo(
    () => ({
      usuario,
      loading: authLoading || loading,
      refreshUsuario,
      isSuperadmin: Boolean(usuario?.superadmin),
      isProvisioned: Boolean(usuario),
    }),
    [usuario, authLoading, loading, refreshUsuario]
  );

  return <UsuarioContext.Provider value={value}>{children}</UsuarioContext.Provider>;
}

export function useUsuario() {
  const ctx = useContext(UsuarioContext);
  if (!ctx) throw new Error("useUsuario deve ser usado dentro de UsuarioProvider");
  return ctx;
}
