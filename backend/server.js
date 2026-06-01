import "./load-env.js";
import express from "express";
import cors from "cors";

import { wrapApiHandler, attachApiErrorLogger } from "../api/_lib/apiLogger.js";

import leadsRegistrarCliqueHandler from "../api/leads/registrar-clique.js";
import leadsRedirecionarHandler from "../api/leads/redirecionar.js";
import leadsWebhookEvolutionHandler from "../api/leads/webhook-evolution.js";
import leadsCriarLinkHandler from "../api/leads/criar-link.js";
import leadsAtualizarLinkHandler from "../api/leads/atualizar-link.js";
import leadsExcluirLinkHandler from "../api/leads/excluir-link.js";
import leadsCriarInstanciaHandler from "../api/leads/criar-instancia.js";
import leadsExcluirInstanciaHandler from "../api/leads/excluir-instancia.js";
import leadsConfigurarWebhookHandler from "../api/leads/configurar-webhook-instancia.js";
import leadsConectarInstanciaHandler from "../api/leads/conectar-instancia.js";
import leadsQrPublicHandler from "../api/leads/qr-public.js";
import leadsStatusInstanciaHandler from "../api/leads/status-instancia.js";
import leadsSalvarConfigMetaHandler from "../api/leads/salvar-config-meta.js";
import leadsTestarMetaHandler from "../api/leads/testar-meta.js";
import leadsWebhookUrlHandler from "../api/leads/webhook-url.js";
import leadsAtualizarEtapaLeadHandler from "../api/leads/atualizar-etapa-lead.js";
import leadsAtualizarValorVendaLeadHandler from "../api/leads/atualizar-valor-venda-lead.js";
import adminCriarClienteHandler from "../api/admin/criar-cliente.js";
import adminAtualizarContaHandler from "../api/admin/atualizar-conta.js";
import adminRegistrarPagamentoHandler from "../api/admin/registrar-pagamento.js";
import adminAtivarOnboardingHandler from "../api/admin/ativar-onboarding.js";
import adminImpersonarHandler from "../api/admin/impersonar.js";
import contaAdicionarMembroHandler from "../api/conta/adicionar-membro.js";
import contaAtualizarContaHandler from "../api/conta/atualizar-conta.js";
import contaAtualizarMembroHandler from "../api/conta/atualizar-membro.js";
import contaRemoverMembroHandler from "../api/conta/remover-membro.js";
import cronVerificarVencimentosHandler from "../api/cron/verificar-vencimentos.js";
import perfilAvatarHandler from "../api/perfil/avatar.js";
import devPreviewEmailHandler from "../api/dev/preview-email.js";

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json({ limit: "512kb" }));
app.use(attachApiErrorLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "viziom-api" });
});

const post = (path, handler) => app.post(path, wrapApiHandler(handler));
const get = (path, handler) => app.get(path, wrapApiHandler(handler));

post("/api/leads/registrar-clique", leadsRegistrarCliqueHandler);
get("/api/leads/redirecionar", leadsRedirecionarHandler);
post("/api/leads/webhook-evolution", leadsWebhookEvolutionHandler);
post("/api/leads/criar-link", leadsCriarLinkHandler);
post("/api/leads/atualizar-link", leadsAtualizarLinkHandler);
post("/api/leads/excluir-link", leadsExcluirLinkHandler);
post("/api/leads/criar-instancia", leadsCriarInstanciaHandler);
post("/api/leads/excluir-instancia", leadsExcluirInstanciaHandler);
post("/api/leads/configurar-webhook-instancia", leadsConfigurarWebhookHandler);
get("/api/leads/conectar-instancia", leadsConectarInstanciaHandler);
get("/api/leads/qr-public", leadsQrPublicHandler);
get("/api/leads/status-instancia", leadsStatusInstanciaHandler);
post("/api/leads/salvar-config-meta", leadsSalvarConfigMetaHandler);
post("/api/leads/testar-meta", leadsTestarMetaHandler);
get("/api/leads/webhook-url", leadsWebhookUrlHandler);
post("/api/leads/atualizar-etapa-lead", leadsAtualizarEtapaLeadHandler);
post("/api/leads/atualizar-valor-venda-lead", leadsAtualizarValorVendaLeadHandler);

post("/api/admin/criar-cliente", adminCriarClienteHandler);
post("/api/admin/atualizar-conta", adminAtualizarContaHandler);
post("/api/admin/registrar-pagamento", adminRegistrarPagamentoHandler);
post("/api/admin/ativar-onboarding", adminAtivarOnboardingHandler);
post("/api/admin/impersonar", adminImpersonarHandler);
post("/api/conta/adicionar-membro", contaAdicionarMembroHandler);
post("/api/conta/atualizar-conta", contaAtualizarContaHandler);
post("/api/conta/atualizar-membro", contaAtualizarMembroHandler);
post("/api/conta/remover-membro", contaRemoverMembroHandler);
post("/api/cron/verificar-vencimentos", cronVerificarVencimentosHandler);
post("/api/perfil/avatar", perfilAvatarHandler);
app.delete("/api/perfil/avatar", wrapApiHandler(perfilAvatarHandler));
get("/api/dev/preview-email", devPreviewEmailHandler);

app.listen(PORT, () => {
  console.log(`Viziom API em http://localhost:${PORT}`);
});
