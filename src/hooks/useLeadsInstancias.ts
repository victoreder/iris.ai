import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import type { LeadsInstanciaWhatsapp } from "@/types/database";
import { LEADS_INSTANCIA_COLUNAS } from "@/types/database";

export function useLeadsInstancias(onlyConnected = true) {
  const { contaAtiva } = useConta();
  const [instancias, setInstancias] = useState<LeadsInstanciaWhatsapp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contaAtiva) {
      setInstancias([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    let q = supabase
      .from("leads_instancias_whatsapp")
      .select(LEADS_INSTANCIA_COLUNAS)
      .eq("conta_id", contaAtiva.id)
      .order("nome");

    if (onlyConnected) {
      q = q.eq("status", "conectado");
    }

    q.then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error(error);
      setInstancias((data as LeadsInstanciaWhatsapp[]) ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [contaAtiva?.id, onlyConnected]);

  return { instancias, loading };
}
