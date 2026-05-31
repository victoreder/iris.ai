import { supabase } from "./supabase";
import { apiPostAuth } from "./api";

const STORAGE_KEY = "viziom_impersonator_session";

interface ImpersonatorSession {
  access_token: string;
  refresh_token: string;
  email: string;
}

export function isImpersonating(): boolean {
  return Boolean(sessionStorage.getItem(STORAGE_KEY));
}

export function getImpersonatorEmail(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as ImpersonatorSession).email;
  } catch {
    return null;
  }
}

export async function startImpersonate(userId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (session) {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        email: session.user.email,
      } satisfies ImpersonatorSession)
    );
  }

  const res = await apiPostAuth<{
    access_token: string;
    refresh_token: string;
  }>("/api/admin/impersonar", { userId });

  const { error } = await supabase.auth.setSession({
    access_token: res.access_token,
    refresh_token: res.refresh_token,
  });

  if (error) {
    sessionStorage.removeItem(STORAGE_KEY);
    throw error;
  }

  window.location.href = "/app";
}

export async function endImpersonate(): Promise<void> {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.location.href = "/sys";
    return;
  }

  const saved = JSON.parse(raw) as ImpersonatorSession;
  sessionStorage.removeItem(STORAGE_KEY);

  const { error } = await supabase.auth.setSession({
    access_token: saved.access_token,
    refresh_token: saved.refresh_token,
  });

  if (error) throw error;
  window.location.href = "/sys";
}
