import { sendEmail } from "../mailer.js";
import { emailLayout, escapeHtml } from "./layout.js";

export async function enviarEmailPlanoAlterado({
  email,
  nomeConta,
  planoAnterior,
  planoNovo,
}) {
  const corpoHtml = `
    <p>O plano da conta <strong>${escapeHtml(nomeConta || "sua conta")}</strong> foi atualizado.</p>
    <table style="width:100%;margin:16px 0;border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:8px 12px;background:#f4f4f5;border-radius:8px 0 0 8px;color:#71717a;">Plano anterior</td>
        <td style="padding:8px 12px;background:#f4f4f5;border-radius:0 8px 8px 0;font-weight:500;">${escapeHtml(planoAnterior || "—")}</td>
      </tr>
      <tr><td colspan="2" style="height:8px;"></td></tr>
      <tr>
        <td style="padding:8px 12px;background:#ecfdf5;border-radius:8px 0 0 8px;color:#166534;">Novo plano</td>
        <td style="padding:8px 12px;background:#ecfdf5;border-radius:0 8px 8px 0;font-weight:600;color:#166534;">${escapeHtml(planoNovo || "—")}</td>
      </tr>
    </table>
    <p>As alterações já estão em vigor. Em caso de dúvidas sobre limites ou cobrança, fale com o suporte.</p>
  `;

  const html = emailLayout({
    titulo: "Plano alterado",
    corpoHtml,
  });

  const text = [
    `Plano da conta ${nomeConta || "sua conta"} alterado.`,
    `Anterior: ${planoAnterior || "—"}`,
    `Novo: ${planoNovo || "—"}`,
  ].join("\n");

  return sendEmail({
    to: email,
    subject: `Viziom — plano alterado para ${planoNovo || "novo plano"}`,
    html,
    text,
  });
}
