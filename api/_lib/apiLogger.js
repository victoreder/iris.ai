import { getSupabase } from "../_lib.js";

export async function logBackendError(
  supabase,
  {
    path,
    method,
    statusCode,
    mensagem,
    error,
    usuarioId = null,
    contaId = null,
    body = null,
  }
) {
  const client = supabase ?? getSupabase();
  const detalhes = {
    path,
    method,
    statusCode,
    message: error?.message ?? mensagem,
    stack: error?.stack?.split("\n").slice(0, 5),
    body: body ? sanitizeBody(body) : null,
  };

  try {
    await client.from("system_logs").insert({
      tipo: "backend_erro",
      nivel: statusCode >= 500 ? "erro" : "aviso",
      mensagem: mensagem ?? error?.message ?? "Erro na API",
      detalhes,
      usuario_id: usuarioId,
      conta_id: contaId,
    });
  } catch (logErr) {
    console.error("Falha ao gravar log de backend:", logErr);
  }
}

function sanitizeBody(body) {
  if (!body || typeof body !== "object") return body;
  const copy = { ...body };
  for (const key of ["password", "senha", "senhaTemporaria", "token", "access_token"]) {
    if (key in copy) copy[key] = "[redacted]";
  }
  return copy;
}

export function wrapApiHandler(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(`API ${req.method} ${req.path}:`, err);
      await logBackendError(getSupabase(), {
        path: req.path,
        method: req.method,
        statusCode: 500,
        mensagem: `Exceção não tratada: ${req.method} ${req.path}`,
        error: err,
        body: req.body,
      });
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message ?? "Erro interno." });
      }
    }
  };
}

/** Middleware Express: loga respostas JSON com status >= 400. */
export function attachApiErrorLogger(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function jsonWithLog(body) {
    if (res.statusCode >= 400 && body && typeof body === "object" && body.error) {
      void logBackendError(getSupabase(), {
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        mensagem: String(body.error),
        body: req.body,
      });
    }
    return originalJson(body);
  };
  next();
}
