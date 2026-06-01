import { getAppPublicUrl } from "../smtp.js";

/** Paleta alinhada a src/index.css */
export const C = {
  primary: "#3f37ff",
  primaryFg: "#ffffff",
  bg: "#f8f9fc",
  fg: "#000415",
  card: "#ffffff",
  muted: "#f1f3f9",
  mutedFg: "#64748b",
  border: "#e2e8f0",
  brand: "#000415",
  successBg: "#ecfdf5",
  successFg: "#15803d",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function emailButton(href, label) {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;background:${C.primary};color:${C.primaryFg};text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>`;
}

export function emailCredBox(label, value) {
  return `
    <div style="margin:12px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${C.mutedFg};">${escapeHtml(label)}</p>
      <p style="margin:0;background:${C.muted};border:1px solid ${C.border};padding:12px 16px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px;color:${C.fg};word-break:break-all;">${escapeHtml(value)}</p>
    </div>`;
}

export function emailSteps(steps) {
  const items = steps
    .map(
      (step, i) => `
    <tr>
      <td style="vertical-align:top;padding:0 12px 16px 0;width:32px;">
        <span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:${C.primary};color:${C.primaryFg};font-size:13px;font-weight:700;">${i + 1}</span>
      </td>
      <td style="vertical-align:top;padding:2px 0 16px;font-size:15px;line-height:1.55;color:${C.fg};">${step}</td>
    </tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 4px;">${items}</table>`;
}

export function emailEmpresaBadge(nomeEmpresa) {
  return `<p style="margin:16px 0;padding:10px 16px;background:${C.muted};border-left:4px solid ${C.primary};border-radius:0 8px 8px 0;font-size:15px;font-weight:600;color:${C.fg};">${escapeHtml(nomeEmpresa)}</p>`;
}

export function emailLayout({ titulo, corpoHtml, rodape, botaoHref, botaoLabel, ocultarBotao = false }) {
  const appUrl = getAppPublicUrl();
  const href = botaoHref || appUrl;
  const label = botaoLabel || "Acessar o Viziom";
  const botaoHtml = ocultarBotao
    ? ""
    : `<tr>
            <td style="padding:0 32px 28px;">
              ${emailButton(href, label)}
            </td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${C.fg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:${C.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,4,21,.08);border:1px solid ${C.border};">
          <tr>
            <td style="padding:20px 32px;background:${C.brand};">
              <p style="margin:0;font-size:18px;font-weight:700;color:${C.primaryFg};letter-spacing:-0.02em;">Viziom</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.3;color:${C.fg};">${escapeHtml(titulo)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;font-size:15px;line-height:1.6;color:${C.fg};">
              ${corpoHtml}
            </td>
          </tr>
          ${botaoHtml}
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid ${C.border};font-size:12px;color:${C.mutedFg};line-height:1.5;">
              ${rodape ?? `Este e-mail foi enviado automaticamente pelo Viziom.<br /><a href="${escapeAttr(appUrl)}" style="color:${C.primary};text-decoration:none;">${escapeHtml(appUrl)}</a>`}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function formatDataPtBr(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
