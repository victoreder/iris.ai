import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { LeadsInstanciaWhatsapp } from "@/types/database";

const URL_PARAM = "whatsapp";

function storageKey(contaId: string) {
  return `viziom_jornada_whatsapp_${contaId}`;
}

function resolveInstanciaId(
  instancias: LeadsInstanciaWhatsapp[],
  contaId: string | undefined,
  urlId: string | null
) {
  if (instancias.length === 0) return "";

  if (urlId && instancias.some((i) => i.id === urlId)) return urlId;

  if (contaId) {
    const saved = localStorage.getItem(storageKey(contaId));
    if (saved && instancias.some((i) => i.id === saved)) return saved;
  }

  return instancias[0].id;
}

export function useWhatsappSelection(
  contaId: string | undefined,
  instancias: LeadsInstanciaWhatsapp[]
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const instanciaId = useMemo(
    () => resolveInstanciaId(instancias, contaId, searchParams.get(URL_PARAM)),
    [instancias, contaId, searchParams]
  );

  useEffect(() => {
    if (!instanciaId) return;

    if (searchParams.get(URL_PARAM) !== instanciaId) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(URL_PARAM, instanciaId);
          return next;
        },
        { replace: true }
      );
    }

    if (contaId) {
      localStorage.setItem(storageKey(contaId), instanciaId);
    }
  }, [contaId, instanciaId, searchParams, setSearchParams]);

  const setInstanciaId = useCallback(
    (id: string) => {
      if (!instancias.some((i) => i.id === id)) return;

      if (contaId) {
        localStorage.setItem(storageKey(contaId), id);
      }

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(URL_PARAM, id);
          return next;
        },
        { replace: true }
      );
    },
    [contaId, instancias, setSearchParams]
  );

  return { instanciaId, setInstanciaId };
}
