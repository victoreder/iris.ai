import { useMemo } from "react";
import { useConta } from "@/contexts/ContaContext";
import { appRoutes, contaUrlRef } from "@/lib/appNavigation";

export function useAppRoutes() {
  const { contaAtiva } = useConta();
  return useMemo(
    () => appRoutes(contaAtiva ? contaUrlRef(contaAtiva) : null),
    [contaAtiva]
  );
}
