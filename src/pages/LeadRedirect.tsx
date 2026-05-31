import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { collectAttribution } from "@/lib/collectAttribution";
import { registerLeadClick } from "@/lib/registerClick";

declare global {
  interface Window {
    __goRedirectStarted?: boolean;
    __goRedirectPromise?: Promise<{ ok: boolean; error?: string }>;
  }
}

const META_WAIT_MS = 5000;

const spinnerStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: "3px solid #3F37FF",
  borderTopColor: "transparent",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

export function LeadRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const metaMode = searchParams.get("meta") === "1";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = metaMode ? "Aguarde…" : "Redirecionando…";
  }, [metaMode]);

  useEffect(() => {
    const s = slug?.trim();
    if (!s) {
      setError("Link inválido.");
      return;
    }

    const run = async () => {
      if (!metaMode && window.__goRedirectPromise) {
        const result = await window.__goRedirectPromise;
        if (!result.ok) {
          setError(result.error ?? "Não foi possível abrir o WhatsApp.");
        }
        return;
      }

      const attribution = collectAttribution();
      const registerPromise = registerLeadClick(s, attribution, {
        metaPageView: metaMode,
      });

      if (metaMode) {
        const [, result] = await Promise.all([
          new Promise<void>((resolve) => setTimeout(resolve, META_WAIT_MS)),
          registerPromise,
        ]);
        if (!result.ok || !result.waUrl) {
          setError(result.error ?? "Não foi possível abrir o WhatsApp.");
          return;
        }
        window.location.replace(result.waUrl);
        return;
      }

      const result = await registerPromise;
      if (!result.ok || !result.waUrl) {
        setError(result.error ?? "Não foi possível abrir o WhatsApp.");
        return;
      }
      window.location.replace(result.waUrl);
    };

    void run();
  }, [slug, metaMode]);

  if (!metaMode && !error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f9fc",
        }}
        aria-busy="true"
        aria-label="Redirecionando"
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        background: "#f8f9fc",
      }}
    >
      {error ? (
        <p style={{ color: "#b91c1c", textAlign: "center", maxWidth: 360 }}>{error}</p>
      ) : (
        <>
          <p style={{ color: "#171717", fontSize: 18, fontWeight: 600, textAlign: "center" }}>
            Por favor, aguarde alguns segundos.
          </p>
          <p style={{ color: "#525252", marginTop: 8, textAlign: "center", maxWidth: 360 }}>
            Estamos localizando um atendente disponível…
          </p>
          <div style={{ ...spinnerStyle, marginTop: 24 }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
