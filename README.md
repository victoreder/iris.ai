# HubLabel Tracking

Repositório **standalone** do produto de rastreamento WhatsApp (`go.hublabel.com.br` + API + webhook Evolution + Meta CAPI).

Extraído do monorepo [Admin-HubLabel](../Admin-HubLabel). O painel admin (links, jornada, dashboard) pode ficar no sistema interno da sua empresa; este repo concentra o que precisa rodar em produção para o tracking funcionar.

## Estrutura

```
HubLabel-Tracking/
├── index.html, src/, public/   # App go (Vite) — domínio público /l/{slug}
├── api/leads/                  # Handlers HTTP
├── api/_lib/                   # Core: clique, codec, webhook, jornada, Meta, Evolution
├── backend/server.js           # Express só com rotas /api/leads/*
├── supabase/migrations/        # Schema leads_*
└── .env.example
```

## Pré-requisitos

- Node 20+
- Projeto Supabase (aplicar migrations em `supabase/migrations/` na ordem do prefixo `leads_`)
- Instância [Evolution API](https://evolution-api.com/) (WhatsApp)
- (Opcional) Pixel + token Meta Conversions API

## Setup local

### 1. Banco

No SQL Editor do Supabase, execute na ordem:

1. `leads_whatsapp.sql`
2. `leads_jornada.sql`
3. `leads_logs.sql`
4. `leads_cliques_instancia_sem_link.sql`

### 2. Variáveis

```bash
cp .env.example .env
# Preencha SUPABASE_*, EVOLUTION_*, BACKEND_PUBLIC_URL
```

### 3. API

```bash
cd backend
npm install
npm run dev
# http://localhost:3333
```

### 4. Frontend go

```bash
# na raiz do repo
npm install
# .env na raiz com VITE_BACKEND_URL=http://localhost:3333
npm run dev
# http://localhost:5175/l/seu-slug
```

Teste: crie instância/link via API ou Supabase, conecte WhatsApp, abra `/l/{slug}`.

## Deploy sugerido

| Parte | Onde | Notas |
|--------|------|--------|
| **go** (raiz) | Vercel projeto separado | `VITE_BACKEND_URL` = URL da API em produção; domínio `go.seudominio.com` |
| **API** | Railway / Render / VPS / mesmo Vercel com adapter | `BACKEND_PUBLIC_URL` HTTPS — Evolution webhook aponta para `/api/leads/webhook-evolution` |

Opcional no Vercel do go: rewrite `/l/:slug` → `GET {API}/api/leads/redirecionar?slug=:slug` (302 sem React). Ver comentário no `.env.example` da raiz.

## Rotas da API

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/leads/registrar-clique` | Go público — retorna `waUrl` |
| GET | `/api/leads/redirecionar` | Redirect 302 server-side |
| POST | `/api/leads/webhook-evolution` | Webhook Evolution |
| POST | `/api/leads/criar-instancia` | Criar WhatsApp Evolution |
| GET | `/api/leads/conectar-instancia` | QR Code |
| GET | `/api/leads/status-instancia` | Sincronizar telefone |
| POST | `/api/leads/criar-link` | Criar link `/l/{slug}` |
| … | demais em `api/leads/` | Meta, jornada manual, etc. |

`GET /health` — health check.

## Admin interno

Este repo **não** inclui UI admin. No Admin-HubLabel as telas em `src/pages/leads/*` continuam consumindo o mesmo Supabase e podem chamar **esta** API em produção (`VITE_BACKEND_URL` apontando para o deploy do tracking).

Para um admin novo: use as mesmas tabelas + estas rotas (ou Supabase direto com RLS para usuários autenticados).

## Origem dos arquivos

Copiados de `Admin-HubLabel/go`, `Admin-HubLabel/api/leads`, `Admin-HubLabel/api/_lib/*` (leads) e migrations `leads_*`. O `api/_lib.js` aqui é só Supabase (sem SMTP do admin).
