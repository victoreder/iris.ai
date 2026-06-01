import { supabase } from "./supabase";

export function getBackendUrl(): string {
  const base = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  return base ? base.replace(/\/+$/, "") : "";
}

async function parseApiError(res: Response) {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) throw new Error(data.error);
  } catch (err) {
    if (err instanceof Error && err.message !== text) throw err;
  }
  if (res.status === 404) {
    throw new Error(
      "Rota da API não encontrada. Reinicie o backend: cd backend && npm run dev"
    );
  }
  throw new Error(text.slice(0, 120) || "Erro na requisição.");
}

async function apiFetch(url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "API indisponível. Inicie o backend com: cd backend && npm run dev (porta 3333)."
    );
  }
}

export async function apiPost<T>(
  path: string,
  body: Record<string, unknown>,
  contaId: string
): Promise<T> {
  const base = getBackendUrl();
  if (!base) throw new Error("VITE_BACKEND_URL não configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await apiFetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Conta-Id": contaId,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await parseApiError(res);
  return res.json() as Promise<T>;
}

export async function apiPostAuth<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const base = getBackendUrl();
  if (!base) throw new Error("VITE_BACKEND_URL não configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await apiFetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await parseApiError(res);
  return res.json() as Promise<T>;
}

export async function apiGet<T>(
  path: string,
  params: Record<string, string>,
  contaId: string
): Promise<T> {
  const base = getBackendUrl();
  if (!base) throw new Error("VITE_BACKEND_URL não configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const qs = new URLSearchParams(params).toString();
  const res = await apiFetch(`${base}${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Conta-Id": contaId,
    },
  });

  if (!res.ok) await parseApiError(res);
  return res.json() as Promise<T>;
}

export async function apiDeleteAuth<T>(path: string): Promise<T> {
  const base = getBackendUrl();
  if (!base) throw new Error("VITE_BACKEND_URL não configurado.");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");

  const res = await apiFetch(`${base}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) await parseApiError(res);
  return res.json() as Promise<T>;
}
