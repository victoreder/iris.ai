import { sendEmail } from "../mailer.js";
import { emailLayout, escapeHtml } from "./layout.js";

export async function enviarEmailBoasVindas({ email, nome, senhaTemporaria, nomeConta }) {
  const saudacao = nome ? `Olá, ${escapeHtml(nome)}!` : "Olá!";
  const corpoHtml = `
    <p>${saudacao}</p>
    <p>Sua conta no Viziom foi criada${nomeConta ? ` para <strong>${escapeHtml(nomeConta)}</strong>` : ""}.</p>
    <p>Use o e-mail abaixo para entrar:</p>
    <p style="background:#f4f4f5;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:14px;">${escapeHtml(email)}</p>
  ${
    senhaTemporaria
      ? `<p>Senha temporária:</p>
    <p style="background:#f4f4f5;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:14px;">${escapeHtml(senhaTemporaria)}</p>
    <p style="font-size:13px;color:#71717a;">Recomendamos alterar a senha após o primeiro acesso em Configurações → Perfil.</p>`
      : ""
  }
    <p>Complete o cadastro da empresa no primeiro acesso, se ainda estiver pendente.</p>
  `;

  const html = emailLayout({
    titulo: "Bem-vindo ao Viziom",
    corpoHtml,
  });

  const text = [
    nome ? `Olá, ${nome}!` : "Olá!",
    "Sua conta no Viziom foi criada.",
    `E-mail: ${email}`,
    senhaTemporaria ? `Senha temporária: ${senhaTemporaria}` : "",
    "Acesse o painel pelo link do e-mail.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return sendEmail({
    to: email,
    subject: "Bem-vindo ao Viziom — sua conta foi criada",
    html,
    text,
  });
}
