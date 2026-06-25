# Plano de Implementação — Integração com Marketplaces (Mercado Livre & Shopee)

> **Objetivo:** Permitir que produtos cadastrados no M2 Auto Hub sejam publicados automaticamente nas contas da empresa no **Mercado Livre** e na **Shopee**, e que as **vendas realizadas nesses marketplaces** sejam recebidas, sincronizadas e gerenciadas de dentro da própria aplicação (estoque, status, pedidos).
>
> **Princípio condutor:** tornar a parte burocrática (criar app, autorizar conta, conectar) o mais **guiada e automática** possível para o usuário — com assistentes ("wizards") passo a passo no frontend, validação de pré-requisitos e links diretos.

- **Autor:** Equipe M2 Auto Hub
- **Data:** 2026-06-24
- **Status:** Proposta / aguardando aprovação
- **Stack alvo:** `apps/backend` (Node + Express + Prisma/PostgreSQL) · `apps/frontend` (React + Vite)

---

## Sumário

1. [Visão geral e viabilidade](#1-visão-geral-e-viabilidade)
2. [Análise da aplicação atual](#2-análise-da-aplicação-atual)
3. [Arquitetura proposta](#3-arquitetura-proposta)
4. [Modelo de dados (Prisma)](#4-modelo-de-dados-prisma)
5. [Backend — módulo `marketplace`](#5-backend--módulo-marketplace)
6. [Integração Mercado Livre](#6-integração-mercado-livre)
7. [Integração Shopee](#7-integração-shopee)
8. [Sincronização de estoque, preço e pedidos](#8-sincronização-de-estoque-preço-e-pedidos)
9. [Frontend — UX e wizard de onboarding](#9-frontend--ux-e-wizard-de-onboarding)
10. [Guia burocrático automatizado (o diferencial)](#10-guia-burocrático-automatizado-o-diferencial)
11. [Segurança e segredos](#11-segurança-e-segredos)
12. [Roadmap por fases](#12-roadmap-por-fases)
13. [Riscos e mitigação](#13-riscos-e-mitigação)
14. [Referências](#14-referências)

---

## 1. Visão geral e viabilidade

**É totalmente viável.** Ambos os marketplaces oferecem APIs REST oficiais com OAuth 2.0:

| Recurso | Mercado Livre | Shopee |
|---|---|---|
| Publicar produto | ✅ API de Items / User Products | ✅ Product API |
| Atualizar preço/estoque | ✅ Sincronização de publicações | ✅ Inventory API |
| Receber vendas | ✅ Webhooks (topic `orders`) | ✅ Webhooks (push) + Order API |
| Autenticação | OAuth 2.0 (Authorization Code) | OAuth 2.0 + assinatura HMAC |
| Documentação BR | Excelente (PT-BR) | Razoável (EN, com guia BR) |
| Atrito de acesso de dev | Baixo | Médio/Alto (aprovação Open Platform) |

> **Importante (single-tenant):** o M2 Auto Hub é uma loja única (a M2). Não há modelo `Company`/`Tenant`. Logo, há **uma** conexão por marketplace (uma conta vendedor ML + uma conta Shopee). Isso simplifica: guardamos 1 conjunto de tokens por provider.

---

## 2. Análise da aplicação atual

Pontos do código já existentes que favorecem a integração:

- **Produtos** — [apps/backend/prisma/schema.prisma](../apps/backend/prisma/schema.prisma#L287) já possui: `name`, `description`, `category`, `sku` (único), `salePrice`, `promoPrice`, `stock`, `images` (Json), `specifications` (Json), `status`.
- **Compatibilidade veicular** — `ProductVehicleCompatibility` ([schema.prisma:440](../apps/backend/prisma/schema.prisma#L440)). **Crítico**: o Mercado Livre exige atributos de compatibilidade para autopeças — já temos a modelagem.
- **Pedidos** — `Order` ([schema.prisma:469](../apps/backend/prisma/schema.prisma#L469)) possui o enum `OrderSource` (hoje `WEB`) e `OrderItem`. Vamos estender `OrderSource` com `MERCADO_LIVRE` e `SHOPEE`.
- **Arquitetura modular** — `apps/backend/src/modules/*` com padrão `routes → controller → service → dto`. Adicionaremos um módulo `marketplace` no mesmo padrão.
- **Registro de rotas** — [apps/backend/src/app.ts](../apps/backend/src/app.ts#L93). Adicionaremos `app.use('/marketplace', marketplaceRoutes)` e `app.use('/webhooks', webhookRoutes)`.
- **Auth admin** — `AdminAuthMiddleware.requireMinRole(AdminRole.X)` ([products.routes.ts](../apps/backend/src/modules/products/products.routes.ts)). As rotas de conexão exigirão `ADMIN`.
- **Navegação admin** — [apps/frontend/src/components/admin/adminNavigation.ts](../apps/frontend/src/components/admin/adminNavigation.ts). Adicionaremos um item `marketplace` na seção `Catálogo` ou nova seção `Marketplaces`.

---

## 3. Arquitetura proposta

```
                ┌─────────────────────────────────────────────┐
                │              FRONTEND (admin)                │
                │  • Wizard de conexão (OAuth) por marketplace │
                │  • Painel "Marketplaces" (status, listings)  │
                │  • Botão "Publicar" no ProductModal          │
                │  • Pedidos unificados (filtro por origem)    │
                └───────────────────┬─────────────────────────┘
                                    │ REST /marketplace/*
                ┌───────────────────▼─────────────────────────┐
                │           BACKEND — módulo marketplace        │
                │                                              │
                │  OAuthService ─ token store + refresh job    │
                │  ProviderAdapter (interface comum)           │
                │    ├── MercadoLivreAdapter                   │
                │    └── ShopeeAdapter                         │
                │  ListingService ─ M2 Product → anúncio       │
                │  SyncService ─ estoque/preço (M2 ↔ MP)       │
                │  WebhookController ─ recebe vendas            │
                │  OrderImportService ─ cria Order(source=MP)  │
                └───────────────────┬─────────────────────────┘
                                    │ HTTPS
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                      ▼
   api.mercadolibre.com                                partner.shopeemobile.com
   (Items, Orders, Webhooks)                           (Product, Order, Webhooks)
```

**Padrão Adapter:** uma interface `MarketplaceAdapter` comum (publicar, atualizar, buscar pedido, validar token) com duas implementações. Isso isola as diferenças (assinatura HMAC da Shopee, formatos de payload) e facilita adicionar futuros marketplaces (Amazon, Magalu).

```ts
interface MarketplaceAdapter {
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<TokenSet>;
  refreshToken(refreshToken: string): Promise<TokenSet>;
  publishProduct(product: ProductWithCompat, account: Account): Promise<ExternalListing>;
  updateListing(listingId: string, patch: ListingPatch, account: Account): Promise<void>;
  updateStock(listingId: string, stock: number, account: Account): Promise<void>;
  fetchOrder(externalOrderId: string, account: Account): Promise<NormalizedOrder>;
  verifyWebhook(req: Request): boolean;
}
```

---

## 4. Modelo de dados (Prisma)

Nova migration (ex.: `20260625000000_add_marketplace_integration`). Adicionar ao [schema.prisma](../apps/backend/prisma/schema.prisma):

```prisma
enum MarketplaceProvider {
  MERCADO_LIVRE
  SHOPEE
}

enum MarketplaceConnectionStatus {
  DISCONNECTED   // nunca conectado
  PENDING        // app criado, aguardando autorização/aprovação
  CONNECTED      // tokens válidos, operando
  TOKEN_EXPIRED  // refresh falhou, precisa reconectar
  ERROR
}

enum ListingSyncStatus {
  DRAFT          // ainda não publicado
  QUEUED         // na fila de publicação
  PUBLISHED      // anúncio ativo
  OUT_OF_SYNC    // M2 mudou e ainda não propagou
  PAUSED         // anúncio pausado no marketplace
  ERROR
}

// Conexão (1 por provider, single-tenant)
model MarketplaceConnection {
  id            String                      @id @default(uuid())
  provider      MarketplaceProvider         @unique
  status        MarketplaceConnectionStatus @default(DISCONNECTED)

  // Credenciais do app (criptografadas em repouso)
  appId         String?   // ML: app_id / Shopee: partner_id
  appSecret     String?   // ML: secret_key / Shopee: partner_key  (ENCRYPTED)

  // Conta autorizada
  sellerId      String?   // ML: user_id / Shopee: shop_id
  sellerNickname String?

  // Tokens OAuth (ENCRYPTED)
  accessToken   String?
  refreshToken  String?
  tokenExpiresAt DateTime?

  // Diagnóstico
  lastSyncAt    DateTime?
  lastError     String?   @db.Text
  scopes        Json?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  listings      MarketplaceListing[]

  @@map("marketplace_connections")
}

// Vínculo Produto M2 ↔ anúncio externo (N produtos × M providers)
model MarketplaceListing {
  id               String              @id @default(uuid())
  productId        String
  connectionId     String
  provider         MarketplaceProvider

  externalId       String?             // ML: MLB123 / Shopee: item_id
  externalUrl      String?
  status           ListingSyncStatus   @default(DRAFT)

  // Espelho do que foi publicado (para detectar drift)
  lastSyncedPrice  Decimal?            @db.Decimal(10, 2)
  lastSyncedStock  Int?
  lastSyncedHash   String?             // hash do payload publicado
  lastError        String?             @db.Text

  // Mapeamento específico do marketplace
  categoryMapping  Json?               // categoria/atributos resolvidos
  publishedAt      DateTime?

  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt

  product          Product             @relation(fields: [productId], references: [id], onDelete: Cascade)
  connection       MarketplaceConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([productId, provider])
  @@index([connectionId])
  @@index([externalId])
  @@index([status])
  @@map("marketplace_listings")
}

// Log de eventos (auditoria/idempotência de webhooks)
model MarketplaceEvent {
  id           String              @id @default(uuid())
  provider     MarketplaceProvider
  topic        String              // "orders", "items", "shop_order", ...
  externalId   String              // id do recurso (order_id etc.)
  rawPayload   Json
  processed    Boolean             @default(false)
  processedAt  DateTime?
  error        String?             @db.Text
  createdAt    DateTime            @default(now())

  @@unique([provider, topic, externalId])  // idempotência
  @@index([processed])
  @@map("marketplace_events")
}
```

**Alterações em modelos existentes:**

```prisma
// enum OrderSource: adicionar valores
enum OrderSource {
  WEB
  ADMIN
  MERCADO_LIVRE   // novo
  SHOPEE          // novo
}

// model Order: rastrear origem externa
model Order {
  // ...campos existentes...
  externalOrderId   String?   @unique  // id do pedido no marketplace
  externalProvider  MarketplaceProvider?
  // ...
}

// model Product: relação reversa
model Product {
  // ...campos existentes...
  marketplaceListings MarketplaceListing[]
}
```

---

## 5. Backend — módulo `marketplace`

Estrutura (seguindo o padrão dos módulos existentes):

```
apps/backend/src/modules/marketplace/
├── marketplace.routes.ts            # rotas REST + webhooks
├── marketplace.controller.ts        # conexão, status, publicação manual
├── webhook.controller.ts            # recebe notificações dos MPs
├── services/
│   ├── oauth.service.ts             # fluxo OAuth + token store (cripto)
│   ├── token-refresh.service.ts     # job de renovação
│   ├── listing.service.ts           # publicar/atualizar/pausar
│   ├── sync.service.ts              # estoque/preço M2 ↔ MP
│   └── order-import.service.ts      # webhook → Order(source=MP)
├── adapters/
│   ├── marketplace-adapter.ts       # interface comum
│   ├── mercado-livre.adapter.ts
│   └── shopee.adapter.ts
├── mappers/
│   ├── ml-product.mapper.ts         # Product → payload ML (+ compat)
│   ├── ml-category.resolver.ts      # category_id + atributos
│   ├── shopee-product.mapper.ts
│   └── shopee-category.resolver.ts
└── dto/
    ├── connect-marketplace.dto.ts
    └── publish-product.dto.ts
```

**Rotas (resumo):**

```
# Conexão / onboarding (ADMIN)
GET    /marketplace/connections                 # status de todas as conexões
POST   /marketplace/:provider/credentials       # salvar appId/appSecret
GET    /marketplace/:provider/authorize         # devolve URL OAuth (state)
GET    /marketplace/:provider/callback          # callback OAuth → troca code por token
POST   /marketplace/:provider/disconnect
POST   /marketplace/:provider/test              # valida token (sanity check)

# Publicação / listings (MANAGER+)
GET    /marketplace/listings                     # lista com status de sync
POST   /marketplace/listings/:productId/publish  # publica em 1+ providers
POST   /marketplace/listings/:id/sync            # força ressincronização
POST   /marketplace/listings/:id/pause
DELETE /marketplace/listings/:id                 # encerra anúncio

# Categoria/atributos (assistente de mapeamento)
GET    /marketplace/:provider/categories/suggest?q=  # predição de categoria
GET    /marketplace/:provider/categories/:id/attributes

# Webhooks (públicos, sem auth de admin — validados por assinatura)
POST   /webhooks/mercadolivre
POST   /webhooks/shopee
```

Registrar em [app.ts](../apps/backend/src/app.ts#L93):
```ts
app.use('/marketplace', marketplaceRoutes);
app.use('/webhooks', webhookRoutes);   // antes do 404 handler
```

> Nota: webhooks precisam responder **rápido (200)** e processar de forma assíncrona. Como não há fila no projeto hoje, o handler grava em `MarketplaceEvent` e retorna 200; um processador (cron/`setInterval` ou worker) consome eventos `processed=false`. Em produção, considerar BullMQ/Redis (fase posterior).

---

## 6. Integração Mercado Livre

### 6.1 Fluxo OAuth
- **Grant:** Authorization Code (server-side).
- **URL de autorização:** `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id={APP_ID}&redirect_uri={CALLBACK}&state={STATE}`
- **Troca de token:** `POST https://api.mercadolibre.com/oauth/token` → `access_token` (expira em **6h** / `expires_in: 21600`), `refresh_token`, `user_id`.
- **Renovação:** `grant_type=refresh_token`; cada refresh devolve **novo** refresh token → persistir sempre o mais recente.

### 6.2 Publicar produto
- `POST https://api.mercadolibre.com/items` com: `title`, `category_id`, `price`, `currency_id: "BRL"`, `available_quantity`, `buying_mode: "buy_it_now"`, `listing_type_id`, `condition: "new"`, `pictures[]`, `attributes[]`, `description`.
- **Mapeamento de categoria:** usar o *category predictor* (`/sites/MLB/domain_discovery/search?q={título}`) para sugerir `category_id`; depois buscar atributos obrigatórios em `/categories/{id}/attributes`.
- **Autopeças (crítico):** categorias de autopeças exigem **compatibilidade veicular**. Usar nossa tabela `ProductVehicleCompatibility` para preencher as compatibilidades via Compatibility Manager (`/items/{id}/compatibilities`). Categorias com suporte: `MLB22693` etc.
- **Imagens:** o ML hospeda; enviamos URLs públicas (já servidas em `/uploads/*`).

### 6.3 Vendas (webhooks)
- No DevCenter, configurar **Callback URL Notifications** → `https://{dominio}/webhooks/mercadolivre` e marcar tópicos: `orders_v2`, `items`, `questions`, `shipments`.
- O webhook envia `{ resource: "/orders/123", topic, user_id }`. Buscamos `GET /orders/123` (com access_token) e criamos `Order` com `source=MERCADO_LIVRE`, `externalOrderId`, itens mapeados por `externalId` → `MarketplaceListing` → `Product`.
- Decrementar estoque no M2 e propagar para os outros listings (anti-overselling).

### 6.4 Pré-requisitos do vendedor
- Conta **profissional** validada (dados do titular + upload de documento do responsável).
- Usuário que autoriza precisa ser **administrador** da conta. Sem pendências de documentos (senão `invalid_grant`).

---

## 7. Integração Shopee

### 7.1 Fluxo OAuth + assinatura
- Base: `https://partner.shopeemobile.com` (BR usa a mesma com `region`).
- **Cada request é assinada (HMAC-SHA256):** `sign = HMAC(partner_key, partner_id + path + timestamp + access_token + shop_id)`. O adapter centraliza essa assinatura.
- **Autorização da loja:** gerar link de autorização (`/api/v2/shop/auth_partner`) → seller loga e autoriza → callback com `code` → `POST /api/v2/auth/token/get` (com `partner_id`, `code`, `shop_id`) → `access_token` (4h) + `refresh_token` (válido por mais tempo).
- **Renovação:** `/api/v2/auth/access_token/get` com `refresh_token`.

### 7.2 Publicar produto
- `POST /api/v2/product/add_item` com `category_id`, `name`, `description`, `price_info`, `stock_info`, `image[]`, `attribute_list`, `logistic_info` (canais de frete habilitados).
- **Categoria/atributos:** `/api/v2/product/get_category` e `/api/v2/product/get_attributes`. Marcas exigem `brand_id` (`/api/v2/product/get_brand_list`).
- Shopee exige logística configurada na loja antes de publicar (resolver no wizard — ver §10).

### 7.3 Vendas (webhooks)
- Configurar **Push Mechanism** no painel da Open Platform → `https://{dominio}/webhooks/shopee`, tópicos `order_status_push` / `shop_order`.
- Recebe `ordersn`; buscar detalhe em `/api/v2/order/get_order_detail` → criar `Order` com `source=SHOPEE`.

### 7.4 Pré-requisitos (atrito maior)
- **Solicitar acesso à Shopee Open Platform** (aprovação): conta de vendedor BR ativa + cadastro de app (gera `partner_id` / `partner_key`).
- Ambiente **sandbox** para testes antes de produção.

---

## 8. Sincronização de estoque, preço e pedidos

**Gatilhos de saída (M2 → Marketplace):** interceptar no `ProductsService` (create/update/updateStock). Ao salvar um produto que tenha `MarketplaceListing` ativo, enfileirar sync de preço/estoque. Usar `lastSyncedHash` para evitar chamadas redundantes.

**Gatilhos de entrada (Marketplace → M2):**
- **Venda:** webhook → `OrderImportService` decrementa `Product.stock` e **propaga** o novo estoque para os demais listings (evita vender o mesmo item duas vezes em marketplaces diferentes).
- **Reconciliação periódica:** cron diário compara estoque/preço M2 × marketplace e corrige drift (rede falha, webhook perdido).

**Anti-overselling:** estoque é mantido como fonte única de verdade no M2; toda venda (web, ML, Shopee) decrementa o mesmo `Product.stock` e dispara propagação. Listing com `stock=0` é pausado automaticamente.

---

## 9. Frontend — UX e wizard de onboarding

### 9.1 Navegação
Adicionar em [adminNavigation.ts](../apps/frontend/src/components/admin/adminNavigation.ts) (nova seção):
```ts
{ id: "marketplaces", label: "Marketplaces", icon: Store, section: "Catálogo" },
```

### 9.2 Tela "Marketplaces" (painel)
- **Cards de conexão** (Mercado Livre / Shopee) com status visual: 🔴 Desconectado · 🟡 Pendente · 🟢 Conectado.
- Cada card mostra: conta conectada, nº de anúncios ativos, última sincronização, e botão **"Conectar"** ou **"Gerenciar"**.

### 9.3 Wizard de conexão (componente `MarketplaceConnectWizard`)
Passos guiados (modal/stepper), por marketplace:
1. **Pré-requisitos** — checklist com o que o usuário precisa ter (conta vendedor ativa, etc.) e links diretos.
2. **Criar o app** — instruções passo a passo + link "Abrir DevCenter / Open Platform" + campos para colar `App ID` e `Secret`. Mostra o **Redirect URI** e a **Callback URL** já preenchidos e com botão "copiar".
3. **Autorizar conta** — botão "Conectar minha conta" que abre o OAuth do marketplace em popup; ao voltar com sucesso, status vira 🟢.
4. **Teste** — botão "Testar conexão" chama `/marketplace/:provider/test` e confirma.

### 9.4 Publicação no `ProductModal`
- Aba/seção **"Marketplaces"** no [ProductModal.tsx](../apps/frontend/src/components/admin/ProductModal.tsx): toggles "Publicar no Mercado Livre" / "Publicar na Shopee".
- Ao ativar, mostra **assistente de categoria** (sugestão automática via predictor) e destaca **atributos obrigatórios faltantes** (ex.: compatibilidade veicular para autopeças) antes de permitir publicar.
- Status do anúncio por marketplace (badge + link "ver no marketplace").

### 9.5 Pedidos unificados
- Em [AdminContent](../apps/frontend/src/components/admin/AdminContent.tsx) / lista de pedidos: filtro por **origem** (Web / Mercado Livre / Shopee) com ícone do canal em cada pedido. Reaproveita a tela de pedidos existente (`Order.source`).

---

## 10. Guia burocrático automatizado (o diferencial)

O objetivo é eliminar o "não sei o que fazer" do usuário. Implementar:

### 10.1 Checklist inteligente de pré-requisitos
Endpoint `GET /marketplace/:provider/readiness` que retorna um checklist com o status de cada pré-requisito que **dá pra verificar** (ex.: credenciais salvas? token válido? domínio com HTTPS configurado para webhook?) — e os que dependem do usuário ficam como itens manuais com instruções.

### 10.2 Valores prontos para copiar
O backend expõe e o frontend exibe (com botão "copiar"):
- **Redirect URI** exata: `https://m2centerauto.com.br/api/marketplace/{provider}/callback`
- **Callback de notificações**: `https://m2centerauto.com.br/api/webhooks/{provider}`
- Lista de **scopes/tópicos** recomendados para marcar.

> O domínio de produção já é `m2centerauto.com.br` (ver [README](../README.md#L62)) e o gateway roteia `/api/*` → backend. Isso satisfaz a exigência de URL pública HTTPS para os callbacks.

### 10.3 Conteúdo guiado embutido (passo a passo dentro do app)
Cada wizard traz o passo a passo textual + screenshots/links:

**Mercado Livre:**
1. Acessar o **DevCenter** → "Criar nova aplicação".
2. Preencher Nome (único), Descrição (≤150 chars) e Logo.
3. Colar a **Redirect URI** fornecida pelo M2.
4. Marcar **todos os scopes**.
5. Em Tópicos, marcar `orders_v2`, `items`, `questions`, `shipments` e colar a **Callback URL** do M2.
6. Copiar **App ID** e **Secret Key** de volta para o M2.
7. Garantir conta **profissional validada** (documento do responsável).

**Shopee:**
1. Entrar na **Shopee Open Platform** (região BR) com login de vendedor.
2. **Solicitar acesso** à Open Platform (processo de aprovação) — destacar que pode levar dias.
3. Criar app → obter `partner_id` e `partner_key`.
4. Testar no **sandbox** antes de produção.
5. Configurar **Push (webhook)** com a Callback URL do M2.
6. Autorizar a loja pelo link gerado no M2.

### 10.4 Estado "Pendente" inteligente
Enquanto a Shopee não aprova o app, a conexão fica `PENDING` com mensagem clara ("Aguardando aprovação da Shopee — você será notificado quando puder concluir") e um botão "Já fui aprovado → continuar". Notificação via [NotificationCenter](../apps/frontend/src/components/admin/NotificationCenter.tsx) quando o teste de token passar.

---

## 11. Segurança e segredos

- **Criptografia em repouso** de `appSecret`, `accessToken`, `refreshToken` (AES-256-GCM com chave em variável de ambiente `MARKETPLACE_ENC_KEY`). Nunca retornar segredos crus pela API (mascarar).
- **Validação de webhook:** ML valida por `user_id`/origem; Shopee valida pela **assinatura HMAC** no header — rejeitar requests sem assinatura válida.
- **`state` no OAuth** para prevenir CSRF; expira em poucos minutos.
- **Idempotência:** `MarketplaceEvent` com unique `(provider, topic, externalId)` evita processar a mesma venda duas vezes.
- **Rate limits:** respeitar limites (Shopee throttla); aplicar retry com backoff exponencial no adapter.
- Rotas de conexão exigem `AdminRole.ADMIN`; publicação exige `MANAGER+`.
- Novas variáveis em `.env`: `MARKETPLACE_ENC_KEY`, `APP_BASE_URL` (para montar redirect/callback).

---

## 12. Roadmap por fases

| Fase | Entregável | Esforço estimado* |
|---|---|---|
| **0. Fundação** | Migration (modelos + enums), módulo `marketplace` esqueleto, OAuthService + cripto, registro de rotas | 3–5 dias |
| **1. Mercado Livre — conexão** | Wizard OAuth ML, salvar/renovar token, tela Marketplaces, `/test` | 4–6 dias |
| **2. ML — publicação** | Mapper produto→item, resolver categoria/atributos, **compatibilidade veicular**, botão publicar no ProductModal, sync preço/estoque | 6–10 dias |
| **3. ML — vendas** | Webhook + OrderImportService, pedidos unificados, anti-overselling | 4–6 dias |
| **4. Shopee — conexão** | Adapter com assinatura HMAC, wizard + estado "Pendente/aprovação", sandbox | 5–8 dias |
| **5. Shopee — publicação + vendas** | Mapper, categorias/atributos, logística, webhook de pedidos | 6–10 dias |
| **6. Robustez** | Reconciliação diária (cron), fila assíncrona (BullMQ/Redis), retries, observabilidade | 4–6 dias |

\* Estimativas para 1 dev. Recomenda-se **entregar o Mercado Livre ponta a ponta primeiro** (fases 0→3) como MVP, validar com vendas reais, e só então atacar a Shopee.

---

## 13. Riscos e mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Aprovação da Shopee Open Platform demora/é negada | Bloqueia fase 4–5 | Começar pelo ML; iniciar solicitação Shopee em paralelo no dia 1 |
| Mapeamento de categoria/atributos errado → publicação rejeitada | Anúncios não saem | Usar predictor + validar atributos obrigatórios no frontend antes de publicar; logar erros em `MarketplaceListing.lastError` |
| Overselling (venda simultânea em 2 canais) | Cliente sem produto | Estoque único no M2 + propagação imediata + pausa automática em `stock=0` |
| Webhook perdido (rede/downtime) | Pedido não importado | Reconciliação periódica (cron) + reprocessamento de `MarketplaceEvent` |
| Token expira/refresh falha | Sync para | Job de refresh proativo (antes do vencimento) + status `TOKEN_EXPIRED` com alerta no painel |
| Sem fila no projeto hoje | Webhooks lentos travam request | Gravar evento e responder 200 já; processar em worker; evoluir para Redis/BullMQ na fase 6 |
| "Construir vs. comprar" | Custo de manutenção | Avaliar hubs (Bling, Tiny, ANYMARKET, Olist) como alternativa antes da fase 4 se o time for pequeno |

---

## 14. Referências

**Mercado Livre**
- [Publicar produtos](https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos/)
- [Autenticação e Autorização (OAuth 2.0)](https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao)
- [Criar uma aplicação no Mercado Livre (DevCenter)](https://developers.mercadolivre.com.br/pt_br/crie-uma-aplicacao-no-mercado-livre)
- [Registrar sua aplicação (Redirect URI, scopes, tópicos)](https://developers.mercadolivre.com.br/en_us/register-your-application)
- [Sincronização e modificação de publicações](https://developers.mercadolivre.com.br/pt_br/produto-sincronizacao-de-publicacoes)
- [Compatibilidades entre itens e produtos de Autopeças](https://developers.mercadolivre.com.br/pt_br/compatibilidades-itens-e-produtos-de-autopecas)
- [Domínios, produtos e atributos para Autopeças](https://developers.mercadolivre.com.br/pt_br/referencias-de-dominios-produtos-e-atributos-para-autopecas)
- [Items & Searches](https://developers.mercadolivre.com.br/en_us/items-and-searches)

**Shopee**
- [Shopee Open API Platform — Passo a Passo de Solicitação (BR)](https://seller.br.shopee.cn/edu/article/3445)
- [Shopee Open Platform — Developer Guide](https://open.shopee.com/developer-guide/12)
- [Shopee API — guia de integração (api2cart)](https://api2cart.com/api-technology/shopee-api/)
- [Shopee Product/Order API (api2cart)](https://api2cart.com/news/shopee-api-documentation/)
- [Central do Vendedor Shopee BR](https://seller.shopee.com.br/)

**Alternativas (construir vs. comprar)**
- Hubs de integração: Bling, Tiny ERP, ANYMARKET, Olist (já homologados com ML e Shopee).
