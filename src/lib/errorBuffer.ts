export interface ErroCapturado {
  mensagem: string;
  origem?: string;
  timestamp: string;
}

const MAX_ERROS = 10;
const buffer: ErroCapturado[] = [];
let inicializado = false;

function registrar(mensagem: string, origem?: string) {
  buffer.unshift({
    mensagem: mensagem.slice(0, 500),
    origem,
    timestamp: new Date().toISOString(),
  });
  if (buffer.length > MAX_ERROS) buffer.length = MAX_ERROS;
}

export function initErrorBuffer() {
  if (inicializado || typeof window === "undefined") return;
  inicializado = true;

  window.addEventListener("error", (event) => {
    registrar(event.message, event.filename ? `${event.filename}:${event.lineno}` : undefined);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason instanceof Error ? event.reason.message : String(event.reason);
    registrar(msg, "unhandledrejection");
  });
}

export function getRecentErrors(): ErroCapturado[] {
  return [...buffer];
}
