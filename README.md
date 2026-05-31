# Viziom

SaaS de rastreamento de leads no WhatsApp — monolito com app admin + links públicos de tracking.

## Estrutura

```
Viziom/
├── src/                    # React (app admin + go /l/{slug})
├── api/leads/              # Handlers HTTP
├── api/_lib/               # Core: clique, webhook, jornada, Meta, Evolution
├── backend/server.js       # Express — rotas /api/leads/*
├── supabase/migrations/    # Schema multi-tenant
└── .env.example
```

## Domínios (produção)

| Rota | Uso |
|------|-----|
| `app.dominio` | Login + painel (`/app/*`) |
| `go.dominio/l/{slug}` | Redirect público para WhatsApp |

No deploy monolito, um único build serve ambos.

## Deploy na Vercel

1. **Project Settings → Build & Deployment → Framework Preset** → **Vite** (não use "Services")
2. Configure as variáveis de ambiente (ver `.env.example`)
3. Domínios: `app.seudominio.com` (painel + `/api/*`) e `go.seudominio.com` (links `/l/*`)

A API de produção roda como **serverless** na pasta `api/`. A pasta `backend/` é ignorada no deploy (`.vercelignore`) — só serve para dev local com Express.

Após o deploy, teste: `GET https://seu-dominio.com/api/health`

## Setup

### 1. Supabase (projeto novo)

No SQL Editor, execute:

```
supabase/migrations/00001_iris_schema.sql
```

Habilite **Email/Password** em Authentication → Providers.

### 2. Variáveis

```bash
cp .env.example .env
# Preencha VITE_SUPABASE_*, SUPABASE_*, EVOLUTION_*, BACKEND_PUBLIC_URL
```

### 3. API

```bash
cd backend && npm install && npm run dev
# http://localhost:3333
```

### 4. Frontend

```bash
npm install
npm run dev
# http://localhost:5175
```

Fluxo: `/signup` → criar empresa → `/app/channels` (WhatsApp) → campaigns → pipeline → integrations.

## Multi-tenant

- **contas** — workspace/empresa
- **conta_membros** — N:N usuário ↔ conta com papel (`admin`, `membro`, `visualizador`)
- Todas as tabelas `leads_*` têm `conta_id`
- RLS filtra por membership

## Papéis

| Papel | Permissões |
|-------|------------|
| admin | Tudo: WhatsApp, Meta, excluir links/etapas |
| membro | Links, inbox, pipeline, mover etapas |
| visualizador | Somente leitura (Supabase RLS) |

## Rotas do app

| Rota | Tela |
|------|------|
| `/app` | Overview (dashboard) |
| `/app/inbox` | Leads (lista + kanban com drag-and-drop) |
| `/app/campaigns` | Links de campanha |
| `/app/pipeline` | Jornada/funil |
| `/app/channels` | WhatsApp Evolution |
| `/app/integrations` | Meta CAPI |
| `/app/activity` | Logs |

## API autenticada

Rotas admin exigem:

```
Authorization: Bearer {supabase_jwt}
X-Conta-Id: {uuid da conta ativa}
```

Rotas públicas (sem auth): `registrar-clique`, `redirecionar`, `webhook-evolution`.

## E-mail (SMTP)

Configure no `.env` as variáveis `SMTP_*` e `APP_PUBLIC_URL` (link do painel nos e-mails).

| Evento | Quando |
|--------|--------|
| Boas-vindas | Conta criada em `/api/admin/criar-cliente` |
| Vence amanhã | Cron `POST /api/cron/verificar-vencimentos` (1x por ciclo de vencimento) |
| Plano alterado | Superadmin salva conta em `/api/admin/atualizar-conta` |

Migration `00010_emails_lembrete_vencimento.sql` adiciona controle de lembrete na tabela `contas`.
