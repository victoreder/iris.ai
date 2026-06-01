import { sendEmail } from "../mailer.js";
import { C, emailLayout, escapeHtml, formatDataPtBr } from "./layout.js";

export function buildVencimentoAmanhaEmail({ nomeConta, dataVencimento }) {
  const dataFmt = formatDataPtBr(dataVencimento);
  const corpoHtml = `
    <p>A assinatura da conta <strong>${escapeHtml(nomeConta || "sua conta")}</strong> vence <strong>amanhã</strong> (${escapeHtml(dataFmt)}).</p>
    <p>Para evitar a suspensão do acesso, regularize o pagamento ou entre em contato com o suporte antes do vencimento.</p>
    <p style="font-size:13px;color:${C.mutedFg};">Após o vencimento, a conta pode ser suspensa automaticamente até a renovação.</p>
  `;

  const html = emailLayout({
    titulo: "Sua conta vence amanhã",
    corpoHtml,
  });

  const text = [
    `A conta ${nomeConta || "sua conta"} vence amanhã (${dataFmt}).`,
    "Regularize o pagamento para evitar suspensão do acesso.",
  ].join("\n\n");

  return {
    subject: `Viziom — sua conta vence amanhã (${dataFmt})`,
    html,
    text,
  };
}

export async function enviarEmailVencimentoAmanha({ email, nomeConta, dataVencimento }) {
  const { subject, html, text } = buildVencimentoAmanhaEmail({ nomeConta, dataVencimento });
  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
