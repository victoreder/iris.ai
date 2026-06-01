import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MetaLogoIcon } from "@/components/leads/MetaOriginBadge";
import { useConta } from "@/contexts/ContaContext";
import { APP_ROUTES } from "@/lib/appNavigation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const META_PIXEL_CONFIG_HASH = "meta-pixel";

export function MetaPixelHeaderStatus() {
  const { contaAtiva } = useConta();
  const [loading, setLoading] = useState(true);
  const [pixelConfigured, setPixelConfigured] = useState(true);

  const load = useCallback(async () => {
    if (!contaAtiva) return;
    setLoading(true);
    const { data } = await supabase
      .from("leads_config")
      .select("meta_pixel_id")
      .eq("conta_id", contaAtiva.id)
      .maybeSingle();

    setPixelConfigured(Boolean(data?.meta_pixel_id?.trim()));
    setLoading(false);
  }, [contaAtiva?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || pixelConfigured) return null;

  return (
    <Link
      to={`${APP_ROUTES.configuracoes}/integracoes#${META_PIXEL_CONFIG_HASH}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-90",
        "bg-orange-500/15 text-orange-700 dark:text-orange-400"
      )}
    >
      <MetaLogoIcon className="h-3.5 w-auto" />
      Pixel não configurado
    </Link>
  );
}
