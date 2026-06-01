import { sendEmail } from "../mailer.js";
import { getAppPublicUrl } from "../smtp.js";
import {
  C,
  emailEmpresaBadge,
  emailLayout,
  emailSteps,
  escapeHtml,
} from "./layout.js";

export function buildConviteMembroNovoEmail({ email, nome, nomeEmpresa, inviteLink, convidadoPor }) {
  const saudacao = nome ? `Olá, ${escapeHtml(nome)}!` : "Olá!";
  const empresa = nomeEmpresa?.trim() || "uma empresa";
  const por = convidadoPor?.trim();

  const corpoHtml = `
    <p style="margin:0 0 16px;">${saudacao}</p>
    <p style="margin:0 0 8px;">Você foi convidado${por ? ` por <strong>${escapeHtml(por)}</strong>` : ""} para participar da empresa:</p>
    ${emailEmpresaBadge(empresa)}
    <p style="margin:0 0 8px;">Para entrar no Viziom, siga estes passos:</p>
    ${emailSteps([
      "Clique no botão abaixo para aceitar o convite.",
      "Defina sua senha de acesso na página que abrir.",
      `Faça login com o e-mail <strong>${escapeHtml(email)}</strong>.`,
      `Pronto — você já terá acesso à empresa <strong>${escapeHtml(empresa)}</strong>.`,
    ])}
    <p style="margin:0;font-size:13px;color:${C.mutedFg};">O link de convite expira em alguns dias. Se não funcionar, peça um novo convite ao administrador da equipe.</p>
  `;

  const html = emailLayout({
    titulo: "Convite para o Viziom",
    corpoHtml,
    botaoHref: inviteLink || getAppPublicUrl(),
    botaoLabel: "Aceitar convite e criar conta",
  });

  const text = [
    nome ? `Olá, ${nome}!` : "Olá!",
    `Você foi convidado para participar de ${empresa} no Viziom.`,
    "",
    "Passos:",
    "1. Acesse o link abaixo e aceite o convite.",
    "2. Defina sua senha.",
    `3. Faça login com ${email}.`,
    "",
    inviteLink || getAppPublicUrl(),
  ].join("\n");

  return {
    subject: `Convite para ${empresa} no Viziom`,
    html,
    text,
  };
}

export async function enviarEmailConviteMembroNovo(params) {
  const { subject, html, text } = buildConviteMembroNovoEmail(params);
  return sendEmail({
    to: params.email,
    subject,
    html,
    text,
  });
}
