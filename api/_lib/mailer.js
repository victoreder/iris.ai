import nodemailer from "nodemailer";
import { getSmtpConfig, isSmtpConfigured } from "./smtp.js";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getSmtpConfig();
  if (!cfg.host) return null;

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return transporter;
}

/**
 * Envia e-mail. Retorna null se SMTP não estiver configurado (não falha o fluxo).
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!isSmtpConfigured()) {
    console.warn("[mailer] SMTP não configurado — e-mail não enviado:", subject, "→", to);
    return { skipped: true };
  }

  const cfg = getSmtpConfig();
  const transport = getTransporter();
  if (!transport) {
    console.warn("[mailer] Transporte SMTP indisponível");
    return { skipped: true };
  }

  const info = await transport.sendMail({
    from: cfg.from,
    to,
    subject,
    html,
    text: text ?? stripHtml(html),
  });

  return { messageId: info.messageId, skipped: false };
}

function stripHtml(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
