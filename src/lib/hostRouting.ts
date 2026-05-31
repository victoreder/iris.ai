function normalizeOrigin(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function hostnameFromOrigin(origin: string): string {
  return new URL(origin).hostname;
}

function isPublicTrackingPath(pathname: string): boolean {
  return /^\/l\//.test(pathname) || /^\/q\//.test(pathname);
}

/**
 * Separa domínios: go/qrcode só servem links públicos; painel fica em app.
 * Retorna true se redirecionou (não montar o React).
 */
export function enforceHostRouting(): boolean {
  if (typeof window === "undefined") return false;

  const appOrigin = normalizeOrigin(import.meta.env.VITE_APP_PUBLIC_URL);
  const goOrigin = normalizeOrigin(import.meta.env.VITE_GO_URL);
  const qrOrigin = normalizeOrigin(import.meta.env.VITE_QR_PUBLIC_URL);

  if (!appOrigin) return false;

  const { hostname, pathname, search, hash } = window.location;
  const suffix = `${search}${hash}`;
  const appHost = hostnameFromOrigin(appOrigin);
  const goHost = goOrigin ? hostnameFromOrigin(goOrigin) : null;
  const qrHost = qrOrigin ? hostnameFromOrigin(qrOrigin) : null;

  const onGo = goHost != null && hostname === goHost;
  const onQr = qrHost != null && hostname === qrHost;
  const onApp = hostname === appHost;

  if ((onGo || onQr) && !isPublicTrackingPath(pathname)) {
    window.location.replace(`${appOrigin}${pathname}${suffix}`);
    return true;
  }

  if (onApp && /^\/l\//.test(pathname) && goOrigin && goHost !== appHost) {
    window.location.replace(`${goOrigin}${pathname}${suffix}`);
    return true;
  }

  if (onApp && /^\/q\//.test(pathname) && qrOrigin && qrHost !== appHost) {
    window.location.replace(`${qrOrigin}${pathname}${suffix}`);
    return true;
  }

  return false;
}
