import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getBackendUrl } from "@/lib/api";

type QrPublicResponse = {
  qrcode?: string;
  empresaNome?: string;
  alreadyConnected?: boolean;
  telefone?: string;
  error?: string;
};

function qrImageSrc(base64: string): string {
  if (base64.startsWith("data:")) return base64;
  return `data:image/png;base64,${base64}`;
}

export function QrConnectPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState("sua empresa");
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [telefone, setTelefone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const t = token?.trim();
    if (!t) {
      setError("Link inválido.");
      setLoading(false);
      return;
    }

    const base = getBackendUrl();
    if (!base) {
      setError("Serviço indisponível.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${base}/api/leads/qr-public?token=${encodeURIComponent(t)}`);
      const data = (await res.json()) as QrPublicResponse;

      if (!res.ok) {
        setError(data.error ?? "Link inválido ou expirado.");
        setQrcode(null);
        return;
      }

      setEmpresaNome(data.empresaNome ?? "sua empresa");

      if (data.alreadyConnected) {
        setAlreadyConnected(true);
        setTelefone(data.telefone ?? null);
        setQrcode(null);
        return;
      }

      setAlreadyConnected(false);
      setTelefone(null);
      if (!data.qrcode) {
        setError("QR Code indisponível. Atualize a página.");
        return;
      }
      setQrcode(data.qrcode);
    } catch {
      setError("Não foi possível carregar o QR Code.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (alreadyConnected || error) return;
    const interval = setInterval(() => void load(), 25000);
    return () => clearInterval(interval);
  }, [alreadyConnected, error, load]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm">Carregando QR Code…</p>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : alreadyConnected ? (
          <>
            <h1 className="text-xl font-semibold">WhatsApp já conectado</h1>
            <p className="text-sm text-muted-foreground">
              O número {telefone ? `+${telefone}` : ""} já está vinculado a {empresaNome}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold leading-snug">
              Leia o QR Code abaixo para conectar seu WhatsApp a {empresaNome}
            </h1>
            {qrcode && (
              <img
                src={qrImageSrc(qrcode)}
                alt="QR Code WhatsApp"
                className="mx-auto max-w-xs rounded-lg border border-border shadow-sm"
              />
            )}
            <p className="text-xs text-muted-foreground">
              O QR Code é atualizado automaticamente. Abra o WhatsApp → Aparelhos conectados →
              Conectar aparelho.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
