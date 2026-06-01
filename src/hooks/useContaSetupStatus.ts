import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useConta } from "@/contexts/ContaContext";
import type { LeadsConfig, LeadsJornadaEtapa } from "@/types/database";

export type ContaSetupItem = "whatsapp" | "jornada" | "pixel" | "campanha";

export function useContaSetupStatus() {
  const { contaAtiva, isAdmin } = useConta();
  const [loading, setLoading] = useState(true);
  const [pixelOk, setPixelOk] = useState(false);
  const [whatsappOk, setWhatsappOk] = useState(false);
  const [jornadaOk, setJornadaOk] = useState(false);
  const [campanhaOk, setCampanhaOk] = useState(false);

  const load = useCallback(async () => {
    if (!contaAtiva) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [configRes, instRes, linksRes, etapasRes] = await Promise.all([
      supabase.from("leads_config").select("meta_pixel_id, meta_access_token").eq("conta_id", contaAtiva.id).maybeSingle(),
      supabase.from("leads_instancias_whatsapp").select("id").eq("conta_id", contaAtiva.id).limit(1),
      supabase.from("leads_links").select("id").eq("conta_id", contaAtiva.id).limit(1),
      supabase.from("leads_jornada_etapas").select("primeiro_contato").eq("conta_id", contaAtiva.id),
    ]);

    const cfg = configRes.data as Pick<LeadsConfig, "meta_pixel_id" | "meta_access_token"> | null;
    setPixelOk(Boolean(cfg?.meta_pixel_id?.trim() && cfg?.meta_access_token?.trim()));

    setWhatsappOk((instRes.data?.length ?? 0) > 0);
    setCampanhaOk((linksRes.data?.length ?? 0) > 0);

    const etapas = (etapasRes.data as Pick<LeadsJornadaEtapa, "primeiro_contato">[]) ?? [];
    setJornadaOk(etapas.some((e) => !e.primeiro_contato));

    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const missing = useMemo(() => {
    const items: ContaSetupItem[] = [];
    if (!whatsappOk) items.push("whatsapp");
    if (!jornadaOk) items.push("jornada");
    if (!pixelOk) items.push("pixel");
    if (!campanhaOk) items.push("campanha");
    return items;
  }, [whatsappOk, jornadaOk, pixelOk, campanhaOk]);

  const missingLabels: Record<ContaSetupItem, string> = {
    whatsapp: "WhatsApp",
    jornada: "jornada de vendas",
    pixel: "Pixel Meta",
    campanha: "campanha",
  };

  const needsSetup = missing.length > 0;

  const showTourCta =
    Boolean(contaAtiva && !contaAtiva.onboarding_pendente && isAdmin && needsSetup);

  return {
    loading,
    pixelOk,
    whatsappOk,
    jornadaOk,
    campanhaOk,
    needsSetup,
    missing,
    missingText: missing.map((k) => missingLabels[k]).join(", "),
    showTourCta,
    refresh: load,
  };
}
