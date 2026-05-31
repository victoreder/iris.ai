/** Configuração SMTP via variáveis de ambiente. */

export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from = process.env.SMTP_FROM?.trim() || user || "noreply@viziom.app";
  const enabled = process.env.SMTP_ENABLED !== "false" && Boolean(host);

  return { host, port, secure, user, pass, from, enabled };
}

export function isSmtpConfigured() {
  const cfg = getSmtpConfig();
  return cfg.enabled && Boolean(cfg.host);
}

export function getAppPublicUrl() {
  return (
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.VITE_APP_PUBLIC_URL?.trim() ||
    "http://localhost:5175"
  ).replace(/\/$/, "");
}
