# Plano de migração: Evolution API → UAZAPI (uazapiGO v2)

Documentação de referência: [docs.uazapi.com](https://docs.uazapi.com/) (uazapiGO v2.1.1).
Servidor: `https://{subdomain}.uazapi.com`.

Premissa confirmada pelo código atual: **o Iris não envia mensagens pelo WhatsApp via API**. Usa `wa.me` nos links rastreáveis. A Evolution entra só em: criar/conectar/status/excluir instância, webhook de mensagens (jornada de leads) e download de mídia para o S3.

As conexões atuais **não são transferíveis**. Cada WhatsApp precisará escanear o QR (ou pairing) de novo.

---

## 1. Diferença de autenticação (impacto estrutural)

| | Evolution (hoje) | UAZAPI (alvo) |
|---|---|---|
| Auth global | Header `apikey` = `EVOLUTION_API_KEY` | Header `admintoken` = `UAZAPI_ADMIN_TOKEN` |
| Auth por instância | Nome na URL (`/instance/connect/{name}`) | Header `token` = token **por instância** |
| Identificador no webhook | `instance` = `instanceName` (string que nós geramos) | `instance` = **id UUID** da instância UAZAPI |

**Obrigatório:** persistir o `token` retornado em `POST /instance/init`. Sem ele, status, QR, webhook e mídia não funcionam.

Env:

```
UAZAPI_API_URL=https://SEU_SUBDOMINIO.uazapi.com
UAZAPI_ADMIN_TOKEN=...
```

Substituem `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.

---

## 2. Mapeamento endpoint a endpoint (o que o Iris usa hoje)

### 2.1 Criar instância

| | Evolution | UAZAPI |
|---|---|---|
| Ação | `criar-instancia.js` | idem |
| Endpoint | `POST /instance/create` | `POST /instance/init` |
| Auth | `apikey` | `admintoken` |
| Body | `{ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }` | `{ name: instanceName }` |
| Resposta crítica | nome da instância | `{ id, token, name, status }` — **salvar `id` e `token`** |

Fluxo novo:

1. `POST /instance/init` com `admintoken`.
2. Gravar no banco: `instance_name`, `id_externo` (UUID UAZAPI), `token_instancia`.
3. Configurar webhook com o **token da instância** (não o admin).

Erro 403 “already in use” da Evolution deixa de existir no mesmo formato. Homônimo: tratar 400/409 ou reutilizar via `GET /instance/all`.

### 2.2 Conectar / gerar QR

| | Evolution | UAZAPI |
|---|---|---|
| Ação | `conectar-instancia.js`, `qrShare.fetchFreshQrcode`, `qr-public.js` | idem |
| Endpoint | `GET /instance/connect/{instanceName}` | `POST /instance/connect` |
| Auth | `apikey` + nome na URL | header `token` da instância |
| Body | — | `{}` (QR) **ou** `{ phone: "5511..." }` (código de pareamento) |
| QR | `qrcode.base64` / `base64` / `code` | `qrcode` (base64) na resposta do connect **e** em `GET /instance/status` (QR rotaciona) |

Polling de conexão (hoje a cada 5s em `ChannelsPage` → `status-instancia`):

- Evolution: `GET /instance/connectionState/{name}` + `GET /instance/fetchInstances?instanceName=`
- UAZAPI: **`GET /instance/status`** (header `token`)

Campos de status UAZAPI: `disconnected` | `connecting` | `connected` | `hibernated`.

Mapeamento para o enum do banco (`pendente` / `conectando` / `conectado` / `desconectado`):

| UAZAPI `status` | Iris |
|---|---|
| `connected` + `owner`/telefone | `conectado` |
| `connecting` | `conectando` |
| `disconnected` | `desconectado` |
| `hibernated` | `desconectado` (pedir reconectar) |

Telefone da instância: campo `owner` (e fallbacks `phone` / JID). Equivale a `owner` / `wuid` / `ownerJid` da Evolution.

**QR que expira:** após o connect, o QR atualiza em `GET /instance/status`. O poll de 5s já existente deve reler o QR se ainda não conectou (hoje só olha `telefone`). Recomendado: `status-instancia` devolver `qrcode` fresco enquanto `connecting`.

Pairing code (não existe no Iris hoje; opcional na migração): `POST /instance/connect` com `phone` → campo `paircode`.

### 2.3 Estado / telefone

| | Evolution | UAZAPI |
|---|---|---|
| Função | `resolveInstancePhone` | `resolveInstancePhone` reescrito |
| Endpoints | `GET /instance/connectionState/{name}` e `GET /instance/fetchInstances` | **só** `GET /instance/status` |
| Conectado | `state` ~ `open` / `connected` | `status === "connected"` |

`GET /instance/all` (`admintoken`) substitui `fetchInstances` só para admin/debug, não para o fluxo do app.

### 2.4 Excluir instância

| | Evolution | UAZAPI |
|---|---|---|
| Ação | `excluir-instancia.js` | idem |
| Endpoint | `DELETE /instance/delete/{instanceName}` | `DELETE /instance` |
| Auth | `apikey` + nome na URL | header `token` da instância |

Opcional antes: `POST /instance/disconnect` (desconecta o WhatsApp, mantém a instância). O Iris hoje apaga direto — manter o mesmo comportamento com `DELETE /instance`.

### 2.5 Configurar webhook

| | Evolution | UAZAPI |
|---|---|---|
| Ação | `evolutionSetWebhook` | `uazapiSetWebhook` |
| Endpoint | `POST /webhook/set/{instanceName}` | `POST /webhook/set` (spec oficial; n8n também usa `POST /webhook`) |
| Auth | `apikey` | header `token` da instância |
| Eventos hoje | `["MESSAGES_UPSERT"]` | `["messages", "connection"]` |
| URL | `{BACKEND_PUBLIC_URL}/api/leads/webhook-evolution` | mesma URL (ou `/api/leads/webhook-uazapi` com rewrite) |

Body UAZAPI:

```json
{
  "url": "https://app.../api/leads/webhook-evolution",
  "events": ["messages", "connection"],
  "enabled": true,
  "addUrlEvents": false,
  "addUrlTypesMessages": false,
  "excludeMessages": ["wasSentByApi", "isGroupYes"]
}
```

Configuração obrigatória:

- **`addUrlEvents`: `false`** — a URL permanece única (`/api/leads/webhook-evolution`). O tipo de evento vem no JSON (`event`), não na querystring. Não ativar `addUrlTypesMessages`.
- **`excludeMessages` inclui `wasSentByApi`** — filtro oficial da UAZAPI contra loop de automação. Mensagens originadas pela API **não** chegam no webhook.
- **`excludeMessages` inclui `isGroupYes`** — o Iris ignora grupos, igual hoje.

**Não** incluir `fromMeYes`. `wasSentByApi` ≠ `fromMe`:

| Origem | `fromMe` | `wasSentByApi` | Chega no webhook? | Uso no Iris |
|---|---|---|---|---|
| Lead manda | `false` | `false` | Sim | 1º contato / conversão |
| Número conectado manda pelo app | `true` | `false` | Sim | Palavra-chave de etapa |
| Envio via API (`/send/*`) | `true` | `true` | **Não** (excluído) | Iris não envia por API hoje |

Se no futuro o Iris passar a enviar pelo `/send/text`, a jornada de palavra-chave continua vindo só do app; envios da API não reentram no webhook (sem loop).

### 2.6 Download de mídia (histórico do lead)

| | Evolution | UAZAPI |
|---|---|---|
| Ação | `fetchMediaFromEvolution` | `fetchMediaFromUazapi` |
| Endpoint | `POST /chat/getBase64FromMediaMessage/{instanceName}` | `POST /message/download` |
| Auth | `apikey` | header `token` da instância |
| Body | `{ message: { key }, convertToMp4 }` | `{ id: "<id interno UAZAPI da mensagem>" }` |
| Resposta | base64 + mimetype | `{ fileURL, mimetype }` (arquivo expira em **~2 dias** — já fazemos upload S3 na hora) |

No webhook de imagem, `content.URL` é link `mmg.whatsapp.net` (criptografado, `mediaKey`). **Não** baixar essa URL. `JPEGThumbnail` é preview minúsculo — não usar no S3.

Download: `POST /message/download` com `id` da mensagem. No payload real o `message.id` é `{owner}:{messageid}` (ex. `554840423710:3AB34B2CF9821923EA41`). Confirmar na implementação se a API aceita esse `id` ou só o `messageid`.

`convertToMp4` da Evolution **não existe**. Vídeo: gravar o arquivo como vier.

---

## 3. Endpoints Evolution que o Iris **não** chama hoje

Não há `sendText` / `sendMedia` / presença / grupos no código. **Não são necessários** para o sistema continuar 100% igual.

Equivalentes UAZAPI (não implementar agora):

| Se no futuro precisar | UAZAPI |
|---|---|
| Enviar texto | `POST /send/text` |
| Enviar mídia | `POST /send/media` |
| Menu/botões | `POST /send/menu` |
| Reagir | `POST /message/react` |
| Marcar lida | `POST /message/markread` |
| Presença digitando | `POST /message/presence` |

---

## 4. Mapeamento do webhook (payload real)

O spec OpenAPI descreve `{ event, instance, data }`. **O POST real não é isso.** Payload capturado (texto `P`, 1:1, iOS):

### 4.1 Envelope real

```json
{
  "BaseUrl": "https://….uazapi.com",
  "EventType": "messages",
  "instanceName": "hl_uaz_…",
  "owner": "554840423710",
  "token": "<secret — nunca logar>",
  "chatSource": "updated",
  "chat": { /* conversa com o lead */ },
  "message": { /* a mensagem */ }
}
```

`addUrlEvents` desativado. Evento = `body.EventType` (fallback `body.event`).

**Logs:** `prepareWebhookBodyForLog` deve apagar `token` (é o token da instância no body).

### 4.2 Eventos a tratar

| Evento (`EventType`) | Tratar? | Ação |
|---|---|---|
| `messages` | **Sim** | Jornada + histórico |
| `connection` | **Sim** | Status / telefone da instância |
| `history` / `messages_update` / resto | Não | — |

### 4.3 Identificar a instância

Lookup: `leads_instancias_whatsapp.instance_name = body.instanceName`.

Fallback (se `instanceName` vier vazio): `token_instancia = body.token` — sem gravar o token nos logs.

`id_externo` continua útil (resposta do `init`), mas **não** é o campo do webhook.

Mídia: token **do banco** (`token_instancia`), não o do body (mesmo valor, mas o banco é a fonte).

### 4.4 Objeto `message` (exemplos fromMe true / false)

Mesmo chat nos dois casos. O que muda é quem enviou.

| Campo | fromMe true (instância → lead) | fromMe false (lead → instância) | Uso Iris |
|---|---|---|---|
| `fromMe` | `true` | `false` | direção da jornada |
| `wasSentByApi` | `false` (app) | `false` | se `true`, não deveria chegar (`excludeMessages`) |
| `isGroup` | `false` | `false` | grupo → ignorar |
| `text` / `content` | `"P"` | `"P"` | texto / tracking / palavra-chave |
| `type` | `"text"` | `"text"` | tipo simplificado |
| `messageType` | `"Conversation"` | `"Conversation"` | tipo Baileys (PascalCase) |
| `messageid` | id WhatsApp | id WhatsApp | `leads_cliques_mensagens.message_id` |
| `id` | `{owner}:{messageid}` | `{owner}:{messageid}` | fallback de id |
| `messageTimestamp` | epoch ms | epoch ms | `mensagem_em` |
| `chatid` | JID do **lead** `554884549300@s.whatsapp.net` | igual | chat (como `remoteJid`) |
| `chatlid` | LID do lead | igual | **não** usar como telefone |
| `sender` | LID da **instância** `…@lid` | LID do **lead** `…@lid` | **nunca** como telefone |
| `sender_lid` | LID de quem enviou | LID de quem enviou | ignorar p/ telefone |
| `sender_pn` | JID da **instância** `554840423710@s.whatsapp.net` | JID do **lead** `554884549300@s.whatsapp.net` | só confere remetente; **não** é o chat |
| `senderName` | nome no aparelho | nome do contato | log |
| `owner` | número da instância (dígitos) | igual | telefone do canal, não do lead |
| `buttonOrListid` | `""` | `""` | id de botão/lista se houver |
| `mediaType` / `quoted` / `reaction` | vazios neste exemplo | vazios | mídia / citação |

### 4.5 Objeto `chat` (sempre o lead)

| Campo | Exemplo | Uso |
|---|---|---|
| `wa_chatid` | `554884549300@s.whatsapp.net` | JID do lead (= `message.chatid`) |
| `wa_chatlid` | `103074953699572@lid` | LID do lead — não usar como telefone |
| `phone` | `+55 48 8454-9300` | telefone do lead (formatado) |
| `wa_isGroup` / `name` / `wa_contactName` | `false` / `Victor Eder` | grupo / nome |
| `owner` | `554840423710` | número da **instância** |
| `wa_fastid` | `554840423710:554884549300` | instância:lead |

### 4.6 Direção

| Condição | Resultado |
|---|---|
| `message.isGroup` ou `chat.wa_isGroup` ou `chatid` `@g.us` | `grupo` → ignorar |
| `fromMe === false` | `recebida_do_lead` → 1º contato |
| `fromMe === true` | `enviada_pela_instancia` → palavra-chave |

### 4.7 Telefone do lead — regra (LID)

**Não** usar `sender` / `sender_lid` / `chatlid`. São `@lid`.

**Não** usar `sender_pn` quando `fromMe === true`: aí `sender_pn` é a **instância**, não o lead. Casar o lead com o número do canal quebraria a jornada.

Ordem:

1. Dígitos de `message.chatid` ou `chat.wa_chatid` se `@s.whatsapp.net` / `@c.us`
2. Dígitos de `chat.phone` (`+55 48 8454-9300` → `554884549300`)
3. Se `fromMe === false`, dígitos de `message.sender_pn` (confirmação)
4. Nunca `message.owner` / `chat.owner` / `body.owner` como telefone do lead

`remote_jid` gravado: `chatid` / `wa_chatid` (JID do lead), não o LID.

### 4.8 Texto

`content` **não é sempre string**. Texto: `content` = `"P"`. Mídia: `content` = objeto (`URL`, `mimetype`, …).

1. `message.text` se string não vazia
2. `message.content` **somente se for string**
3. `content.caption` se objeto (legenda)
4. `message.buttonOrListid` se ainda vazio (menu)

Imagem sem legenda: `text: ""` — 1º contato ainda vale (telefone + tipo mídia). Palavra-chave de etapa exige texto; mídia outbound sem caption não muda etapa (igual hoje).

### 4.8.1 Mídia (exemplo real `ImageMessage`)

Discriminar por `mediaType` + `messageType` + `type`. Não usar `content.URL` como arquivo.

| Campo | Imagem (exemplo) | Padrão para o resto |
|---|---|---|
| `type` | `"media"` | `"text"` vs `"media"` |
| `mediaType` | `"image"` | `video` / `audio` / `ptt` / `document` / `sticker` |
| `messageType` | `"ImageMessage"` | `VideoMessage` / `AudioMessage` / `DocumentMessage` / `StickerMessage` |
| `text` | `""` | caption se houver |
| `content` | objeto | `mimetype`, `fileLength`; `fileName` no documento; `seconds` no áudio |

Mapa Iris:

| `mediaType` | `messageType` | tipo Iris |
|---|---|---|
| `image` | `ImageMessage` | `imagem` |
| `video` | `VideoMessage` | `video` |
| `audio` / `ptt` / `myaudio` | `AudioMessage` | `audio` |
| `document` | `DocumentMessage` | `documento` |
| `sticker` | `StickerMessage` | `sticker` |
| — | `Conversation` + `type=text` | `texto` |
| — | `ContactMessage` | `contato` |
| — | `LocationMessage` / `LiveLocationMessage` | `localizacao` |

Não precisa de um JSON de cada mídia: o discriminador é o mesmo. Download sempre `/message/download`.

Confirmado com payload real:

| | Áudio (PTT) | Documento |
|---|---|---|
| `mediaType` | `"ptt"` | `"document"` |
| `messageType` | `"AudioMessage"` | `"DocumentMessage"` |
| `type` | `"media"` | `"media"` |
| `text` | `""` | `""` |
| `content.mimetype` | `audio/ogg; codecs=opus` | `application/pdf` |
| extras | `PTT: true`, `seconds`, `waveform` | `fileName` (`Contrato_HubLabel.pdf`), `title`, `pageCount`, `JPEGThumbnail` |
| tipo Iris | `audio` | `documento` |
| `media_nome` | (sem nome) | `content.fileName` |

`mediaType: "ptt"` e `"audio"` caem no mesmo tipo. Vídeo segue o molde da imagem (`mediaType: "video"`).

Logs: não gravar `JPEGThumbnail`, `waveform`, `mediaKey`, `token`, `URL` criptografada do WhatsApp.

### 4.9 Evento `connection`

Tratar `EventType === "connection"`. Telefone do **canal** = `body.owner` (dígitos). Não misturar com o telefone do lead.

### 4.10 Deduplicação

Unique em `messageid`. Manter tratamento `23505`.

### 4.11 Parser (`extractEvolutionMessages`)

Normalizar para o restante do Iris:

```js
const event = body.EventType ?? body.event
const instance = body.instanceName ?? body.instance
const item = body.message ?? body.data
// anexar chat no item para telefone/grupo
```

Um POST = uma mensagem (`body.message` objeto). Se `data` vier array (spec), iterar.

---

## 5. Banco (Supabase)

Tabela `leads_instancias_whatsapp` — nova migration (colunas em português):

```sql
ALTER TABLE public.leads_instancias_whatsapp
  ADD COLUMN IF NOT EXISTS token_instancia text,
  ADD COLUMN IF NOT EXISTS id_externo text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_instancias_id_externo
  ON public.leads_instancias_whatsapp (id_externo)
  WHERE id_externo IS NOT NULL;
```

- `token_instancia`: secret. **Nunca** devolver em `select *` para o frontend (`status-instancia` hoje faz `select("*")` — restringir colunas).
- `id_externo`: UUID do `init` (admin/debug). O webhook identifica por `instanceName`.
- `instance_name`: deve ser o mesmo `name` enviado no `init` — é o `instanceName` do POST.

Instâncias Evolution antigas ficam `desconectado`, `token_instancia` null. UI: “reconectar” cria instância UAZAPI nova (ou `init` + connect) e preenche token/id.

RLS: as colunas novas herdam as policies da tabela. Garantir que o client **não** leia `token_instancia` (view ou column privileges / não incluir no select do frontend). Preferível: token só via service role nas APIs.

---

## 6. Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `api/_lib/evolutionLeads.js` | Reescrever como client UAZAPI (`uazapiFetch` com `token` ou `admintoken`). Manter exports de extração com adapters. |
| `api/_lib/evolutionMedia.js` | Trocar para `/message/download` + `fileURL`. Precisa do **token**, não só `instanceName`. |
| `api/leads/webhook-evolution.js` | Aceitar envelope UAZAPI; branch `connection`; lookup por `id_externo`. Manter rota por compat. |
| `api/_lib/leadsWebhookMatch.js` | `extractEvolutionMessages` + direção via `fromMe`/`chatid`. |
| `api/_lib/leadMensagens.js` | `messageid`/`id`; tipo via `messageType`; mídia com token. |
| `api/_lib/qrShare.js` | `POST /instance/connect` + extrair `qrcode`. `fetchFreshQrcode` precisa do token. |
| `api/leads/criar-instancia.js` | `init` + salvar token/id + webhook. |
| `api/leads/conectar-instancia.js` | connect com token. |
| `api/leads/status-instancia.js` | `GET /instance/status`; não retornar token. |
| `api/leads/excluir-instancia.js` | `DELETE /instance` com token. |
| `api/leads/configurar-webhook-instancia.js` | `/webhook/set` com token. |
| `api/leads/qr-public.js` | QR via token. |
| `api/leads/webhook-url.js` | import do novo módulo. |
| `backend/server.js` | imports; rota antiga pode permanecer. |
| `vercel.json` | `maxDuration` na rota de webhook (mesmo arquivo). |
| `.env.example` | `UAZAPI_*` no lugar de `EVOLUTION_*`. |
| `src/pages/app/ChannelsPage.tsx` | texto “Evolution” → “WhatsApp”; poll pode usar `qrcode` atualizado. |
| `src/components/onboarding/OnboardingWizard.tsx` | mesma troca de copy. |
| `supabase/migrations/00025_*.sql` | colunas novas. |

APIs HTTP do Iris (`/api/leads/criar-instancia` etc.) **não mudam de contrato** para o frontend, exceto campos novos internos.

---

## 7. Ordem de implementação

1. Migration + env `UAZAPI_API_URL` / `UAZAPI_ADMIN_TOKEN`.
2. Client HTTP (`admintoken` vs `token`).
3. CRUD instância: init, connect, status, delete.
4. Webhook set + parser de `messages` + `connection`.
5. Extração texto/telefone/tipo/mídia.
6. QR share / onboarding / poll.
7. Esconder token do client.
8. Cutover: apontar env de produção; usuários reconectam cada número.
9. Remover `EVOLUTION_*` depois que nenhuma instância depender.

---

## 8. Cutover operacional

1. Subir código + migration (instâncias antigas continuam no banco, status `desconectado` após o switch).
2. Configurar UAZAPI no ambiente (URL do servidor contratado + admin token).
3. Cada conta: Canais → conectar → escanear QR. Isso gera `id_externo` + `token_instancia` + webhook.
4. Testar: mensagem inbound (converte lead), mensagem outbound com palavra-chave (muda etapa), mídia no histórico, link rastreável `wa.me` (inalterado).
5. Apagar instâncias órfãs no painel Evolution (opcional).

Não há import de sessão Evolution → UAZAPI.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Token vazando no `select *` | Coluna só no backend; select explícito. |
| Token no body do webhook | Nunca logar `body.token`. Lookup por `instanceName`. |
| LID em `sender` | Telefone do lead = `chatid` / `wa_chatid` / `chat.phone`. Nunca `sender`. |
| `fromMe` + `sender_pn` = número da instância | Não usar `sender_pn` como lead quando `fromMe`. |
| QR expira e a UI fica com QR velho | Devolver QR de `GET /instance/status` no poll. |
| `history` no reconnect dispara milhares de POSTs | Não assinar o evento `history`. |
| Loop se no futuro houver `/send/*` | `excludeMessages: ["wasSentByApi", "isGroupYes"]`. Palavra-chave segue pelo app (`fromMe` sem API). |
| `addUrlEvents` quebra a rota única | Sempre `false`. |
| `POST /message/download` usa `id` interno, não `messageid` | Guardar os dois; download com `id`. |
| `fileURL` expira em 2 dias | Upload S3 imediato (já é o fluxo). |
| 429 limite de instâncias conectadas | Tratar no create/connect; mensagem clara. |
| WhatsApp pessoal instável | Docs UAZAPI recomendam WhatsApp Business. |
| Hosts usam `/webhook` vs `/webhook/set` | Tentar `/webhook/set`; fallback `/webhook`. |

---

## 10. Checklist de paridade (100% do produto atual)

- [ ] Criar canal gera instância UAZAPI e grava token/id
- [ ] QR no modal e no link público (`/q/:token`)
- [ ] Poll até `telefone` preenchido / evento `connection`
- [ ] Webhook inbound: tracking no texto, match por telefone, WhatsApp direto
- [ ] Primeira mensagem do lead → etapa contato inicial + Meta CAPI
- [ ] Mensagem `fromMe` com palavra-chave → avança etapa
- [ ] Histórico texto + mídia no S3
- [ ] Ignorar grupos
- [ ] Excluir canal apaga na UAZAPI e links
- [ ] Reconfigurar webhook
- [ ] Limite de WhatsApps do plano
- [ ] Onboarding wizard
- [ ] Frontend não recebe `token_instancia`

Fontes: spec OpenAPI uazapiGO v2, [docs.uazapi.com](https://docs.uazapi.com/), recebimento de mensagens (webhook `messages` + `/message/download`).
