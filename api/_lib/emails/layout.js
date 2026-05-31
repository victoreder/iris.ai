import { getAppPublicUrl } from "../smtp.js";

export function emailLayout({ titulo, corpoHtml, rodape }) {
  const appUrl = getAppPublicUrl();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;color:#18181b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#71717a;letter-spacing:.04em;text-transform:uppercase;">Viziom</p>
              <h1 style="margin:12px 0 0;font-size:22px;font-weight:600;line-height:1.3;">${escapeHtml(titulo)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
              ${corpoHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <a href="${escapeAttr(appUrl)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;">Acessar o Viziom</a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;line-height:1.5;">
              ${rodape ?? `Este e-mail foi enviado automaticamente pelo Viziom.<br /><a href="${escapeAttr(appUrl)}" style="color:#71717a;">${escapeHtml(appUrl)}</a>`}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function formatDataPtBr(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
