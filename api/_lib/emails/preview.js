import { buildBoasVindasEmail } from "./boasVindas.js";
import { buildConviteMembroExistenteEmail } from "./conviteMembroExistente.js";
import { buildConviteMembroNovoEmail } from "./conviteMembroNovo.js";
import { buildPlanoAlteradoEmail } from "./planoAlterado.js";
import { buildVencimentoAmanhaEmail } from "./vencimentoAmanha.js";
import { C } from "./layout.js";

const AMANHA = new Date();
AMANHA.setDate(AMANHA.getDate() + 1);

const PREVIEW_INVITE_LINK = "https://app.viziom.ia.br/login?preview=convite";

export const EMAIL_PREVIEW_TEMPLATES = {
  "boas-vindas": {
    label: "Boas-vindas (nova conta)",
    build: () =>
      buildBoasVindasEmail({
        email: "joao@empresa.com",
        nome: "João",
        senhaTemporaria: "Padrao123456",
      }),
  },
  "convite-membro-novo": {
    label: "Convite — usuário novo",
    build: () =>
      buildConviteMembroNovoEmail({
        email: "maria@empresa.com",
        nome: "Maria",
        nomeEmpresa: "Empresa Exemplo Ltda",
        inviteLink: PREVIEW_INVITE_LINK,
        convidadoPor: "João Admin",
      }),
  },
  "convite-membro-existente": {
    label: "Convite — usuário com conta",
    build: () =>
      buildConviteMembroExistenteEmail({
        email: "carlos@empresa.com",
        nome: "Carlos",
        nomeEmpresa: "Empresa Exemplo Ltda",
        convidadoPor: "João Admin",
      }),
  },
  vencimento: {
    label: "Vencimento amanhã",
    build: () =>
      buildVencimentoAmanhaEmail({
        nomeConta: "Empresa Exemplo Ltda",
        dataVencimento: AMANHA.toISOString(),
      }),
  },
  "plano-alterado": {
    label: "Plano alterado",
    build: () =>
      buildPlanoAlteradoEmail({
        nomeConta: "Empresa Exemplo Ltda",
        planoAnterior: "Free",
        planoNovo: "Pro",
      }),
  },
};

export function buildEmailPreview(templateId) {
  const entry = EMAIL_PREVIEW_TEMPLATES[templateId];
  if (!entry) return null;
  return entry.build();
}

export function isEmailPreviewAuthorized(req) {
  const secret = process.env.EMAIL_PREVIEW_SECRET?.trim();
  const provided = String(
    req.query?.secret ?? req.headers?.["x-email-preview-secret"] ?? "",
  ).trim();

  if (secret) return provided === secret;

  return process.env.NODE_ENV !== "production" && !process.env.VERCEL;
}

export function buildEmailPreviewIndexHtml(basePath, secretQuery) {
  const items = Object.entries(EMAIL_PREVIEW_TEMPLATES)
    .map(
      ([id, { label }]) =>
        `<li><a href="${basePath}?template=${id}${secretQuery}" style="color:${C.primary};text-decoration:none;font-weight:500;">${label}</a> <span style="color:${C.mutedFg};">(${id})</span></li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview de e-mails — Viziom</title>
</head>
<body style="margin:0;padding:32px 16px;font-family:system-ui,-apple-system,sans-serif;background:${C.bg};color:${C.fg};">
  <div style="max-width:520px;margin:0 auto;background:${C.card};border-radius:12px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,4,21,.08);border:1px solid ${C.border};">
    <p style="margin:0;font-size:13px;font-weight:600;color:${C.primary};letter-spacing:.04em;text-transform:uppercase;">Viziom · Dev</p>
    <h1 style="margin:12px 0 8px;font-size:22px;">Preview de e-mails</h1>
    <p style="margin:0 0 20px;color:${C.mutedFg};font-size:14px;line-height:1.5;">Acesso temporário para visualizar o design dos templates transacionais.</p>
    <ul style="margin:0;padding-left:20px;line-height:2.2;font-size:15px;">
      ${items}
    </ul>
    <p style="margin:24px 0 0;font-size:12px;color:${C.mutedFg};">Adicione <code>?format=json</code> na URL para obter assunto e HTML em JSON.</p>
  </div>
</body>
</html>`;
}
