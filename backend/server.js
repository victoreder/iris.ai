import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, ".env") });
import cors from "cors";

import leadsRegistrarCliqueHandler from "../api/leads/registrar-clique.js";
import leadsRedirecionarHandler from "../api/leads/redirecionar.js";
import leadsWebhookEvolutionHandler from "../api/leads/webhook-evolution.js";
import leadsCriarLinkHandler from "../api/leads/criar-link.js";
import leadsAtualizarLinkHandler from "../api/leads/atualizar-link.js";
import leadsExcluirLinkHandler from "../api/leads/excluir-link.js";
import leadsCriarInstanciaHandler from "../api/leads/criar-instancia.js";
import leadsConfigurarWebhookHandler from "../api/leads/configurar-webhook-instancia.js";
import leadsConectarInstanciaHandler from "../api/leads/conectar-instancia.js";
import leadsStatusInstanciaHandler from "../api/leads/status-instancia.js";
import leadsSalvarConfigMetaHandler from "../api/leads/salvar-config-meta.js";
import leadsTestarMetaHandler from "../api/leads/testar-meta.js";
import leadsWebhookUrlHandler from "../api/leads/webhook-url.js";
import leadsAtualizarEtapaLeadHandler from "../api/leads/atualizar-etapa-lead.js";

const app = express();
const PORT = Number(process.env.PORT) || 3333;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hublabel-tracking-api" });
});

app.post("/api/leads/registrar-clique", (req, res) => leadsRegistrarCliqueHandler(req, res));
app.get("/api/leads/redirecionar", (req, res) => leadsRedirecionarHandler(req, res));
app.post("/api/leads/webhook-evolution", (req, res) => leadsWebhookEvolutionHandler(req, res));
app.post("/api/leads/criar-link", (req, res) => leadsCriarLinkHandler(req, res));
app.post("/api/leads/atualizar-link", (req, res) => leadsAtualizarLinkHandler(req, res));
app.post("/api/leads/excluir-link", (req, res) => leadsExcluirLinkHandler(req, res));
app.post("/api/leads/criar-instancia", (req, res) => leadsCriarInstanciaHandler(req, res));
app.post("/api/leads/configurar-webhook-instancia", (req, res) =>
  leadsConfigurarWebhookHandler(req, res)
);
app.get("/api/leads/conectar-instancia", (req, res) => leadsConectarInstanciaHandler(req, res));
app.get("/api/leads/status-instancia", (req, res) => leadsStatusInstanciaHandler(req, res));
app.post("/api/leads/salvar-config-meta", (req, res) => leadsSalvarConfigMetaHandler(req, res));
app.post("/api/leads/testar-meta", (req, res) => leadsTestarMetaHandler(req, res));
app.get("/api/leads/webhook-url", (req, res) => leadsWebhookUrlHandler(req, res));
app.post("/api/leads/atualizar-etapa-lead", (req, res) =>
  leadsAtualizarEtapaLeadHandler(req, res)
);

app.listen(PORT, () => {
  console.log(`HubLabel Tracking API em http://localhost:${PORT}`);
});
