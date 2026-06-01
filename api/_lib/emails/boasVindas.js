import { sendEmail } from "../mailer.js";
import { getAppPublicUrl } from "../smtp.js";
import { C, emailCredBox, emailLayout, escapeHtml } from "./layout.js";

export function buildBoasVindasEmail({ email, nome, senhaTemporaria }) {
  const saudacao = nome ? `Olá, ${escapeHtml(nome)}!` : "Olá!";
  const credenciaisHtml = `
    ${emailCredBox("E-mail de acesso", email)}
    ${senhaTemporaria ? emailCredBox("Senha temporária", senhaTemporaria) : ""}
  `;

  const corpoHtml = `
    <p style="margin:0 0 16px;">${saudacao}</p>
    <p style="margin:0 0 16px;">Seja bem-vindo ao <strong>Viziom</strong>! Sua conta foi criada com sucesso. Use os dados abaixo para acessar a plataforma:</p>
    ${credenciaisHtml}
    ${
      senhaTemporaria
        ? `<p style="margin:16px 0 0;font-size:13px;color:${C.mutedFg};">Por segurança, altere sua senha após o primeiro acesso em <strong>Configurações → Perfil</strong>.</p>`
        : ""
    }
    <p style="margin:16px 0 0;font-size:14px;color:${C.mutedFg};">No primeiro acesso, complete o cadastro da sua empresa se ainda estiver pendente.</p>
  `;

  const html = emailLayout({
    titulo: "Bem-vindo ao Viziom",
    corpoHtml,
    botaoLabel: "Acessar o Viziom",
  });

  const text = [
    nome ? `Olá, ${nome}!` : "Olá!",
    "Seja bem-vindo ao Viziom! Sua conta foi criada.",
    "",
    "Dados de acesso:",
    `E-mail: ${email}`,
    senhaTemporaria ? `Senha temporária: ${senhaTemporaria}` : "",
    "",
    `Acesse: ${getAppPublicUrl()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: "Bem-vindo ao Viziom — seus dados de acesso",
    html,
    text,
  };
}

export async function enviarEmailBoasVindas(params) {
  const { subject, html, text } = buildBoasVindasEmail(params);
  return sendEmail({
    to: params.email,
    subject,
    html,
    text,
  });
}
