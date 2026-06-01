import { sendEmail } from "../mailer.js";
import { getAppPublicUrl } from "../smtp.js";
import { emailEmpresaBadge, emailLayout, escapeHtml, C } from "./layout.js";

export function buildConviteMembroExistenteEmail({ email, nome, nomeEmpresa, convidadoPor }) {
  const saudacao = nome ? `Olá, ${escapeHtml(nome)}!` : "Olá!";
  const empresa = nomeEmpresa?.trim() || "uma empresa";
  const por = convidadoPor?.trim();

  const corpoHtml = `
    <p style="margin:0 0 16px;">${saudacao}</p>
    <p style="margin:0 0 8px;">Você foi adicionado${por ? ` por <strong>${escapeHtml(por)}</strong>` : ""} à equipe da empresa:</p>
    ${emailEmpresaBadge(empresa)}
    <p style="margin:16px 0 0;">Como você já possui uma conta no Viziom (<strong>${escapeHtml(email)}</strong>), basta acessar a plataforma para começar a usar a empresa <strong>${escapeHtml(empresa)}</strong>.</p>
    <p style="margin:16px 0 0;font-size:14px;color:${C.mutedFg};">Se tiver mais de uma empresa vinculada, selecione <strong>${escapeHtml(empresa)}</strong> no menu de contas após entrar.</p>
  `;

  const html = emailLayout({
    titulo: "Você foi adicionado a uma empresa",
    corpoHtml,
    botaoHref: getAppPublicUrl(),
    botaoLabel: `Acessar ${empresa}`,
  });

  const text = [
    nome ? `Olá, ${nome}!` : "Olá!",
    `Você foi adicionado à empresa ${empresa} no Viziom.`,
    "Você já possui conta — acesse a plataforma para entrar.",
    "",
    getAppPublicUrl(),
  ].join("\n");

  return {
    subject: `Você foi adicionado à ${empresa} no Viziom`,
    html,
    text,
  };
}

export async function enviarEmailConviteMembroExistente(params) {
  const { subject, html, text } = buildConviteMembroExistenteEmail(params);
  return sendEmail({
    to: params.email,
    subject,
    html,
    text,
  });
}
