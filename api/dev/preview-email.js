import {
  buildEmailPreview,
  buildEmailPreviewIndexHtml,
  EMAIL_PREVIEW_TEMPLATES,
  isEmailPreviewAuthorized,
} from "../_lib/emails/preview.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!isEmailPreviewAuthorized(req)) {
    if (process.env.VERCEL && !process.env.EMAIL_PREVIEW_SECRET?.trim()) {
      return res.status(404).end();
    }
    return res.status(401).json({ error: "Não autorizado. Informe ?secret= ou o header X-Email-Preview-Secret." });
  }

  const secret = String(req.query?.secret ?? "").trim();
  const secretQuery = secret ? `&secret=${encodeURIComponent(secret)}` : "";
  const basePath = "/api/dev/preview-email";

  const templateId = String(req.query?.template ?? "").trim();

  if (!templateId) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(buildEmailPreviewIndexHtml(basePath, secretQuery));
  }

  if (!EMAIL_PREVIEW_TEMPLATES[templateId]) {
    return res.status(400).json({
      error: "Template inválido.",
      templates: Object.keys(EMAIL_PREVIEW_TEMPLATES),
    });
  }

  const preview = buildEmailPreview(templateId);

  if (String(req.query?.format ?? "").trim() === "json") {
    return res.status(200).json({
      template: templateId,
      subject: preview.subject,
      html: preview.html,
      text: preview.text,
    });
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(preview.html);
}
