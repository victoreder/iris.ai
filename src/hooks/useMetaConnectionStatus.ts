import { useCallback, useEffect, useState } from "react";
import { useConta } from "@/contexts/ContaContext";
import { supabase } from "@/lib/supabase";

export function useMetaConnectionStatus() {
  const { contaAtiva } = useConta();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const reload = useCallback(async () => {
    if (!contaAtiva) {
      setConnected(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("leads_config")
      .select("meta_access_token")
      .eq("conta_id", contaAtiva.id)
      .maybeSingle();

    setConnected(Boolean(String(data?.meta_access_token ?? "").trim()));
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, connected, reload };
}
