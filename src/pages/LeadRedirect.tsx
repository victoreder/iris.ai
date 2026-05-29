import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collectAttribution } from "@/lib/collectAttribution";
import { registerLeadClick } from "@/lib/registerClick";

declare global {
  interface Window {
    __goRedirectStarted?: boolean;
    __goRedirectPromise?: Promise<{ ok: boolean; error?: string }>;
  }
}

export function LeadRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = slug?.trim();
    if (!s) {
      setError("Link inválido.");
      return;
    }

    const run = async () => {
      if (window.__goRedirectPromise) {
        const result = await window.__goRedirectPromise;
        if (!result.ok) {
          setError(result.error ?? "Não foi possível abrir o WhatsApp.");
        }
        return;
      }

      const attribution = collectAttribution();
      const result = await registerLeadClick(s, attribution);
      if (!result.ok || !result.waUrl) {
        setError(result.error ?? "Não foi possível abrir o WhatsApp.");
        return;
      }
      window.location.replace(result.waUrl);
    };

    void run();
  }, [slug]);

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
        background: "#fafafa",
      }}
    >
      <img
        src="https://xnfmuxuvnkhwoymxgmbw.supabase.co/storage/v1/object/public/versoes/LOGO.png"
        alt="HubLabel"
        style={{ height: 48, marginBottom: 24 }}
      />
      {error ? (
        <p style={{ color: "#b91c1c", textAlign: "center", maxWidth: 360 }}>{error}</p>
      ) : (
        <>
          <p style={{ color: "#525252" }}>Redirecionando para o WhatsApp…</p>
          <div
            style={{
              marginTop: 16,
              width: 32,
              height: 32,
              border: "3px solid #ffd323",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
}
