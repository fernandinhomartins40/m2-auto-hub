# Inventário de UI/UX — m2-auto-hub

> **Etapa de inventário. Nada foi implementado, corrigido ou refatorado.**
>
> Objetivo: relação verificável de tudo que existe no frontend, para que nenhuma
> área fique de fora das etapas seguintes de auditoria.
>
> Método: leitura direta do repositório (`App.tsx`, switches de aba, `grep` de
> imports para confirmar referências). **Não houve medição em navegador nesta
> etapa** — medições em runtime estão em `RESPONSIVE-UX-AUDIT.md`, documento
> separado. Onde não foi possível confirmar, está escrito `NÃO VERIFICADO`.
>
> **Revisão 2 (16/09/2026):** os 7 itens `NÃO VERIFICADO` da primeira versão
> foram resolvidos. Ver §18 para o resultado de cada um. A resolução mudou
> conclusões de §4.2, §6, §7.3, §9.3, §9.4 e §15 — em especial, o volume de
> código órfão é bem maior do que a primeira passagem indicava.
>
> **Revisão 3 (16/09/2026):** acrescentada a **matriz consolidada por ID**
> (§15-B), no formato pedido, e o **bloco de contagens finais** (§16-B), com
> os dois eixos de estado separados (descoberta x auditoria). Corrigido o
> número de modais em §8 e §16: era 56, são 47 de aplicação (52 com os
> primitivos) — o 56 era a contagem de `components/ui/`. Registrado também que
> `ui/empty-state.tsx` tem 0 consumidores e `ui/skeleton.tsx` tem 1.
>
> Data: 16/09/2026 · Base: branch `main`

---

## 0. Topologia do repositório

Monorepo npm workspaces + Turborepo.

| Caminho | O que é | Entra na auditoria de UI? |
|---|---|---|
| `apps/frontend` | React 18 + Vite + TS. **Todo o frontend web.** | **Sim — escopo principal** |
| `apps/backend` | Node + Prisma + Postgres | Não (sem UI) |
| `apps/mobile` | App Flutter (admin nativo) | **UI própria, fora do escopo web** — §14 |
| `packages/ui` (`@moria/ui`) | Componentes de instalação PWA | **Sim** — §7.5 |
| `packages/types` (`@moria/types`) | Tipos compartilhados | Não (sem UI) |
| `services/plate-scraper` | Scraper de placa (Playwright) | Não (sem UI) |

### Stack de UI verificada (`apps/frontend/package.json`)

| Camada | Tecnologia |
|---|---|
| Build | Vite 5 + `@vitejs/plugin-react-swc` |
| UI | React 18.3.1, TypeScript 5.8 |
| Estilo | Tailwind 3.4.17 (`darkMode: class`) + `tailwindcss-animate` + `@tailwindcss/typography` |
| Primitivos | Radix UI (27 pacotes) via shadcn/ui |
| Rotas | react-router-dom 6.30 |
| Dados | TanStack Query 5.83 + axios 1.12 |
| Formulários | react-hook-form 7.61 + zod 3.25 + `@hookform/resolvers` (**instalados; ver §9 sobre uso real**) |
| Gráficos | recharts 2.15 |
| Drawer mobile | vaul 0.9 |
| Ícones | lucide-react 0.462 |
| Toasts | sonner 1.7 + toast do Radix |
| Carrossel | embla-carousel-react 8.6 |
| Crop de imagem | react-image-crop 11 + browser-image-compression |
| Testes | Vitest 3.2 + Testing Library + jsdom |

**Volume:** 369 arquivos `.ts/.tsx/.css` em `apps/frontend/src`.

---

## 1. Páginas (rotas registradas em `App.tsx`)

Todas as rotas abaixo foram lidas de `apps/frontend/src/App.tsx`. São **11 rotas
de elemento** + 6 redirects.

### 1.1 Páginas públicas (sem autenticação)

| # | Rota | Arquivo | Área | Layout | Componentes principais | Formulários | Listas | Tabelas | Modais | Ações principais |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | `/` | `pages/Index.tsx` | Landing | nenhum shell — composição direta | `Navbar`, `m2/Hero`, `Highlights`, `About`, `m2/Services`, `m2/Products`, `m2/Promotions`, `Testimonials`, `Contact`, `GoogleMap`, `m2/Footer`, `CartDrawer`, `WhatsAppFAB` | contato (`components/Contact.tsx`) | produtos, serviços, promoções, depoimentos, destaques | — | `CartDrawer`, `CheckoutDrawer` | comprar, adicionar ao carrinho, WhatsApp, contato |
| P2 | `/customer-login/*` | `pages/CustomerLoginPage.tsx` | Cliente | próprio | `CustomerAuthCard` | login / cadastro cliente | — | — | — | entrar, cadastrar |
| P3 | `/admin-login/*` | `pages/AdminLoginPage.tsx` | Admin | próprio | `AdminLoginDialog` | login admin | — | — | — | entrar |
| P4 | `/pwa-entry` | `pages/PwaEntryPage.tsx` | PWA | próprio | `PwaInstallBanner`, `@moria/ui` pwa-install | — | — | — | — | instalar PWA cliente |
| P5 | `/pwa-admin` | `pages/PwaAdminInstallPage.tsx` | PWA | próprio | `@moria/ui` pwa-install | — | — | — | — | instalar PWA admin |
| P6 | `/quote-approval/:token` | `pages/PublicQuoteApprovalPage.tsx` | Orçamento público | próprio | — | aprovação / recusa | itens do orçamento | — | — | aprovar, recusar orçamento |
| P7 | `*` | `pages/NotFound.tsx` | Erro | nenhum | — | — | — | — | — | voltar ao início |

### 1.2 Páginas privadas

| # | Rota | Arquivo | Área | Layout | Componentes principais | Ações |
|---|---|---|---|---|---|---|
| P8 | `/customer/:tab` | `pages/CustomerPanel.tsx` | Cliente | `CustomerLayout` | 9 abas — §3.2 | conforme aba |
| P9 | `/my-account` | `pages/MyAccount.tsx` | Cliente | próprio | — (6 `.map`) | dados da conta |
| P10 | `/store-panel/:tab` | `pages/StorePanel.tsx` | Admin / Lojista | `StoreLayout` | `AdminContent` (20 abas) + `PlateLookupOverlay` | §3.1 |
| P11 | `/mechanic-panel/:tab` | `pages/MechanicPanelPage.tsx` | Mecânico | `MechanicPanel` | `MechanicContent` (3 abas) | §3.3 |

**Fork de papel:** `pages/StorePanel.tsx:47` — se `admin.role === "STAFF"`, a rota
`/store-panel` renderiza `MechanicPanel` em vez de `StoreLayout`. A mesma URL
serve dois shells diferentes.

### 1.3 Redirects (sem UI própria)

`/app → /` · `/customer → /customer/inicio` · `/store-panel → /store-panel/dashboard` ·
`/mechanic-panel → /mechanic-panel/revisoes` · `/admin → /store-panel` ·
`/admin/* → /store-panel`.

### 1.4 Páginas ÓRFÃS — existem no disco, **não têm rota**

Confirmado por `grep` de import em todo `apps/frontend/src`: nenhum arquivo as importa.

| Arquivo | Situação |
|---|---|
| `pages/About.tsx` | órfã — a landing usa `components/About.tsx`, que é outro arquivo |
| `pages/Contact.tsx` | órfã — a landing usa `components/Contact.tsx` |
| `pages/Promocoes.tsx` | órfã — zero referências |

> Não removidas. Apenas registradas para decisão do usuário.

---

## 2. Layouts e shells

São **3 shells de painel** + 4 conjuntos de página com layout próprio.

| # | Shell | Arquivo | Usado por | Mecanismo responsivo |
|---|---|---|---|---|
| L1 | `StoreLayout` | `components/store/StoreLayout.tsx` | `/store-panel/:tab` | fork JS `useIsMobile()` + `isStandalone` (`useMobileLayout`, linha 60); mobile = `StoreHeader` + `StoreBottomNavigation` + `StoreMobileDrawer`; desktop = `Sidebar` |
| L2 | `CustomerLayout` | `components/customer/CustomerLayout.tsx` | `/customer/:tab` | mesmo fork JS (linha 54); mobile = `BottomNavigation` + `MobileDrawer`; desktop = grid `md:grid-cols-3 nb:grid-cols-4` (linha 238), menu em `md:col-span-1`, conteúdo em `md:col-span-2 nb:col-span-3` |
| L3 | `MechanicPanel` | `components/mechanic/MechanicPanel.tsx` | `/mechanic-panel/:tab` e STAFF em `/store-panel` | `MechanicSidebar` com estado `isCollapsed` |
| L4 | Login do cliente | `pages/CustomerLoginPage.tsx` | P2 | layout próprio |
| L5 | Login do admin | `pages/AdminLoginPage.tsx` | P3 | layout próprio |
| L6 | Páginas PWA | `pages/PwaEntryPage.tsx`, `pages/PwaAdminInstallPage.tsx` | P4, P5 | layout próprio |
| L7 | Landing | `pages/Index.tsx` | P1 | sem shell; seções empilhadas |

### 2.1 Primitivos de layout compartilhados

`components/layout/ResponsiveGrids.tsx` — 4 exports:

| Export | Linha | Importado por |
|---|---|---|
| `PageContainer` | 32 | **nenhum arquivo** (verificado por grep) |
| `StatGrid` | 46 | `admin/AdminContent.tsx:48`, `admin/AdminReportsSection.tsx:8` |
| `CardGrid` | 60 | **nenhum arquivo** |
| `ActionRow` | 80 | **nenhum arquivo** |

> Fato verificável: 3 dos 4 primitivos de layout existentes estão sem consumidor.

### 2.2 Cabeçalho compartilhado

`components/admin/AdminPageHeader.tsx` — cabeçalho padrão das seções admin.

**Resolução do item 4:** importado por **17 arquivos** + `pages/StorePanel.tsx`
(que apenas comenta o uso). Os 17 consumidores reais:

`AdminAccountContent`, `AdminContent`, `AdminCouponsSection`,
`AdminProductsSection`, `AdminPromotionsSection`, `AdminReportsSection`,
`AdminServicesSection`, `AdminSupportContent`, `AdminUsersSection`,
`CustomerRelationshipContent`, `LandingPageContent`, `LoyaltyManagement`,
`MarketplacesContent`, `PromotionsManagement`, `PwaSettingsContent`,
`ServiceOrdersContent`, `SettingsContent`.

A contagem "17 telas" de `RESPONSIVE-UX-AUDIT.md` **confere**.

**Seções sem `AdminPageHeader`** (a auditar quanto à consistência de cabeçalho):
`AdminPromotionsOverview`, `RelationshipDashboard`, `RelationshipSettings`,
`RevisionsContent`, `RevisionsListContent`, `RevisionAppointmentsContent`,
`RevisionEditPage`, `ShippingMethodsManagement`, `ProductMarketplacePanel`.
Parte delas é sub-view (recebe o cabeçalho do pai), parte não — distinguir é
tarefa da próxima etapa.

---

## 3. Painéis privados e suas páginas

### 3.1 Painel do Lojista / Admin — `/store-panel/:tab`

Fonte: `components/admin/adminNavigation.ts` (slugs) + switch em
`components/admin/AdminContent.tsx:2145-2249`. **20 abas.**

| # | Aba (id) | Slug da URL | Seção do menu | Componente que renderiza |
|---|---|---|---|---|
| A1 | `dashboard` | `dashboard` | Operação | `renderDashboard()` inline em `AdminContent` |
| A2 | `orders` | `pedidos` | Operação | `renderOrders()` inline |
| A3 | `quotes` | `orcamentos` | Operação | `renderQuotes()` inline |
| A4 | `service-orders` | `ordens-de-servico` | Operação | `ServiceOrdersContent` |
| A5 | `revisions` | `revisoes` | Operação | 3 sub-views: `RevisionAppointmentsContent` / `RevisionsListContent` / `NewRevisionFlow` |
| A6 | `products` | `produtos` | Catálogo | `AdminProductsSection` |
| A7 | `services` | `servicos` | Catálogo | `AdminServicesSection` |
| A8 | `marketplaces` | `marketplaces` | Catálogo | `MarketplacesContent` |
| A9 | `customers` | `clientes` | Clientes | `renderCustomers()` inline |
| A10 | `relationship` | `relacionamento` | Clientes | `CustomerRelationshipContent` |
| A11 | `support` | `suporte` | Clientes | `AdminSupportContent` |
| A12 | `loyalty` | `fidelidade` | Clientes | `LoyaltyManagement` |
| A13 | `coupons` | `cupons` | Marketing | `renderCoupons()` inline + `AdminCouponsSection` |
| A14 | `promotions` | `promocoes` | Marketing | `PromotionsManagement` |
| A15 | `landing-page` | `landing-page` | Marketing | `LandingPageContent` |
| A16 | `account` | `minha-conta` | Gestão | `AdminAccountContent` |
| A17 | `reports` | `relatorios` | Gestão | `renderReports()` inline + `AdminReportsSection` |
| A18 | `pwa-settings` | `pwa` | Gestão | `PwaSettingsContent` |
| A19 | `settings` | `configuracoes` | Gestão | `SettingsContent` |
| A20 | `users` | `usuarios` | Gestão (permissão `canManageAdmins`) | `AdminUsersSection` |

> **`AdminContent.tsx` tem 2.323 linhas** e concentra 6 telas inline (dashboard,
> pedidos, orçamentos, clientes, cupons, relatórios) que não foram extraídas
> para seções próprias como as demais.

### 3.2 Painel do Cliente — `/customer/:tab`

Fonte: `customer/customerNavigation.ts` + switch em `pages/CustomerPanel.tsx`. **9 abas.**

| # | Aba | Slug | Componente |
|---|---|---|---|
| C1 | `dashboard` | `inicio` | `CustomerDashboard` |
| C2 | `profile` | `perfil` | `CustomerProfile` |
| C3 | `quotes` | `orcamentos` | `CustomerQuotes` |
| C4 | `orders` | `pedidos` | `CustomerOrders` |
| C5 | `vehicles` | `veiculos` | `CustomerVehicles` |
| C6 | `revisions` | `revisoes` | `CustomerRevisions` |
| C7 | `favorites` | `favoritos` | `CustomerFavorites` |
| C8 | `coupons` | `cupons` | `CustomerCoupons` |
| C9 | `support` | `suporte` | `SupportDashboard` (+ 10 componentes de suporte, §5.3) |

### 3.3 Painel do Mecânico — `/mechanic-panel/:tab`

Fonte: `mechanic/mechanicNavigation.ts` + `MechanicSidebar.tsx:23-25`. **3 abas.**

| # | Aba | Slug | Rótulo | Componente |
|---|---|---|---|---|
| M1 | `revisions` | `revisoes` | Minhas Revisões | `MechanicRevisionsView` |
| M2 | `service-orders` | `ordens-de-servico` | Minhas OS | `MechanicServiceOrdersView` |
| M3 | `settings` | `perfil` | Perfil | `MechanicSettingsView` |

---

## 4. Frontend público — componentes

### 4.1 Seções da landing (`components/` raiz)

`Navbar`, `Hero`, `Highlights`, `About`, `Services`, `Products`, `Promotions`,
`Testimonials`, `Contact`, `GoogleMap`, `Footer`, `Marquee`, `WhatsAppFAB`,
`NavLink`, `ProductSpecifications`, `CustomerLevel`, `FavoriteButton`,
`CouponInput`, `CartDrawer`, `CheckoutDrawer`, `ErrorBoundary`.

### 4.2 Variantes `m2/components/` — **duplicação confirmada e órfã** ✅ RESOLVIDO

`Footer`, `Hero`, `Products`, `Promotions`, `Services` existem **nos dois lugares**.

`pages/Index.tsx` importa `Footer`, `Hero`, `Products`, `Promotions`, `Services`
de `@/m2/components/`; e `About`, `Contact`, `Highlights`, `Testimonials`,
`Navbar`, `GoogleMap`, `CartDrawer`, `WhatsAppFAB` de `@/components/`.

**Resolução do item 1:** as 5 versões da raiz são **órfãs**. A única referência a
elas é o barrel `components/index.ts` (linhas 6-10, `export * from './Footer'` etc.)
— e **nenhum arquivo importa esse barrel**. A hipótese de que o editor de landing
page as consumia está **descartada**: `LandingPageEditor/SectionEditors` não as
importa.

| Arquivo da raiz | Duplicata viva em | Referências reais |
|---|---|---|
| `components/Footer.tsx` | `m2/components/Footer.tsx` | 0 (só o barrel morto) |
| `components/Hero.tsx` | `m2/components/Hero.tsx` | 0 |
| `components/Products.tsx` | `m2/components/Products.tsx` | 0 |
| `components/Promotions.tsx` | `m2/components/Promotions.tsx` | 0 |
| `components/Services.tsx` | `m2/components/Services.tsx` | 0 |
| `components/index.ts` (o próprio barrel) | — | 0 |

> **Consequência para a auditoria:** as telas públicas a auditar são as de
> `m2/components/`, não as da raiz. Auditar as duas seria trabalho jogado fora.

---

## 5. Componentes por área

### 5.1 Admin — `components/admin/` (56 `.tsx` + 2 `.ts`)

**Seções de tela (26):** `AdminContent`, `AdminAccountContent`,
`AdminCouponsSection`, `AdminProductsSection`, `AdminPromotionsSection`,
`AdminPromotionsOverview`, `AdminReportsSection`, `AdminServicesSection`,
`AdminSupportContent`, `AdminUsersSection`, `CustomerRelationshipContent`,
`LandingPageContent`, `MarketplacesContent`, `PwaSettingsContent`,
`RelationshipDashboard`, `RelationshipSettings`, `RevisionsContent`,
`RevisionsListContent`, `RevisionAppointmentsContent`, `RevisionEditPage`,
`ServiceOrdersContent`, `SettingsContent`, `LoyaltyManagement`,
`PromotionsManagement`, `ShippingMethodsManagement`, `ProductMarketplacePanel`.

**Chrome / navegação (6):** `Sidebar`, `AdminPageHeader`, `NotificationCenter`,
`ProtectedAdminRoute`, `adminNavigation.ts` · **`AdminHeader` — órfão, ver §15.3**.

**Modais (ver §8.1).**

**Upload / imagem (2):** `ProductImageUpload`, `ProductImageCropper`.

**Sub-pasta `settings/` (3):** `PdfBrandingSection`, `PlateLookupSection`,
`PwaSettingsSection`.

**Sub-pasta `LandingPageEditor/`:**
- `SectionEditors/` (11 + `index.ts`): `AboutEditor`, `ContactEditor`,
  `FooterEditor`, `HeaderEditor`, `HeroEditor`, `HighlightsEditor`,
  `MarqueeEditor`, `PreviewProviders`, `ProductsEditor`, `PromotionsEditor`,
  `ServicesEditor`.
- `StyleControls/` (9 + `index.ts`): `ArrayEditor`, `ColorOrGradientPicker`,
  `ColorPicker`, `GradientColorPicker`, `GradientPicker`, `IconSelector`,
  `ImageUploader`, `ImageUploaderWithCrop`, `SliderControl`.

**Dados:** `relationshipTemplates.ts`.

### 5.2 Cliente — `components/customer/` (20 `.tsx` + 1 `.ts`)

`CustomerLayout`, `BottomNavigation`, `MobileDrawer`, `CustomerAuthCard`,
`CustomerDashboard`, `CustomerProfile`, `CustomerQuotes`, `CustomerOrders`,
`CustomerVehicles`, `CustomerRevisions`, `CustomerFavorites`, `CustomerCoupons`,
`FavoriteNotificationSettings`, `customerNavigation.ts`.

Modais: `CreateVehicleModalCustomer`, `EditVehicleModalCustomer`,
`DeleteVehicleDialog`, `LoginDialog`, `RequestQuoteModal`,
`RevisionDetailsDialog`, `ScheduleRevisionModal`.

Arquivo residual: `LoginDialog.tsx.bak` (versionado, §15).

### 5.3 Suporte — `components/customer/support/` (11)

`SupportDashboard`, `TicketList`, `TicketCard`, `TicketDetails`, `TicketChat`,
`TicketRating`, `CreateTicketModal`, `FAQSection`, `FAQCategory`, `FAQItem`,
`QuickContactCard`.

### 5.4 Loja / shell admin — `components/store/` (8)

`StoreLayout`, `StoreHeader`, `StoreBottomNavigation`, `StoreMobileDrawer`,
`MobileModal`, `OrderCard`, `ProductCard`, `withMobileCards` (HOC que converte
tabela em cards no mobile).

### 5.5 Mecânico — `components/mechanic/` (7 `.tsx` + 1 `.ts`)

`MechanicPanel`, `MechanicContent`, `MechanicSidebar`, `MechanicRevisionsView`,
`MechanicServiceOrdersView`, `MechanicSettingsView`, `ProtectedMechanicRoute`,
`mechanicNavigation.ts`.

### 5.6 Revisões — `components/revisions/` (7 + 4 steps + `index.ts`)

`NewRevisionFlow`, `RevisionCard`, `RevisionChecklist`, `ChecklistManager`,
`CustomerSelector`, `VehicleSelector`, `RevisionVehicleLookupDialog`.
Steps do wizard: `StepPlate`, `StepCustomer`, `StepChecklist`, `StepBudget`.

### 5.7 PWA — `components/pwa/` (1)

`PwaInstallBanner`.

---

## 6. Biblioteca UI — `components/ui/` (56 arquivos)

**Primitivos shadcn / Radix (52):** `accordion`, `alert`, `alert-dialog`,
`aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`,
`carousel`, `chart`, `checkbox`, `collapsible`, `combobox`, `command`,
`context-menu`, `dialog`, `drawer`, `dropdown-menu`, `empty-state`, `form`,
`hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`,
`pagination`, `password-input`, `popover`, `progress`, `radio-group`,
`resizable`, `responsive-dialog`, `rich-text-editor`, `scroll-area`, `select`,
`separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`,
`table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`,
`tooltip`.

**Customizados (3):** `ImageCropper`, `ImageUpload`, `ProductImageGallery`.

**Hook:** `use-toast.ts`.

> **Dois componentes de sidebar coexistem:** `components/ui/sidebar.tsx`
> (primitivo shadcn) e `components/admin/Sidebar.tsx` (a sidebar real do painel).
>
> **Resolução do item 3:** o primitivo tem **um único consumidor** —
> `admin/AdminHeader.tsx:1` importa apenas `SidebarTrigger` e o usa na linha 11.
> Mas **`AdminHeader` também é órfão**: nenhum arquivo o importa. E
> **`SidebarProvider` não é usado em lugar nenhum** do projeto (verificado por
> grep), o que significa que o `SidebarTrigger` do `AdminHeader` estaria sem o
> contexto que ele exige.
>
> Cadeia completa: `ui/sidebar.tsx` (≈700 linhas) → usado só por `AdminHeader`
> → que não é usado por ninguém. **Todo esse ramo está morto.** O header real
> do painel é `store/StoreHeader.tsx`.

---

## 7. Hooks de UI, contextos, estilos, tokens e assets

### 7.1 Hooks — `src/hooks/` (34 arquivos)

**De layout / dispositivo (chave para responsividade):**
`use-mobile.tsx` (`useIsMobile`, corte em 768px), `useStandaloneMode`,
`usePwaInstallPrompt`, `usePwaLoginBackGuard`, `useWebShare`, `useBadging`,
`useOfflineCache`, `use-toast.ts`.

**De dados / domínio (25):** `useAdminCoupons`, `useAdminPermissions`,
`useAdminProducts`, `useAdminPromotions`, `useAdminServices`,
`useAdvancedFilters`, `useCoupons`, `useCustomerLevel`, `useFAQ`,
`useFavoriteNotifications`, `useFavorites`, `useFavoritesCache`,
`useFavoritesSync`, `useFipeData`, `useFooterContent`, `useHeroContent`,
`useLandingPageConfig`, `useMarqueeMessages`, `useOrders`, `useProducts`,
`usePromotions`, `useServices`, `useSettings`, `useStoreSettings`, `useSupport`,
`useValidation`. (+ `index.ts`)

### 7.2 Contextos (6)

`context/StorefrontContext.tsx` · `contexts/AdminAuthContext`,
`contexts/AuthContext`, `contexts/CartContext`, `contexts/FavoritesContext`,
`contexts/RevisionsContext` (+ `contexts/index.ts`).

### 7.3 Estilos — `src/styles/` (7 CSS)

| Arquivo | Importado por |
|---|---|
| `cliente.css` | `pages/CustomerPanel.tsx` |
| `lojista.css` | `pages/StorePanel.tsx` |
| `store.css` | `pages/StorePanel.tsx` |
| `store-mobile.css` | `pages/StorePanel.tsx` |
| `store-animations.css` | `pages/StorePanel.tsx` |
| `public.css` | **só `pages/About.tsx` e `pages/Contact.tsx` — ambas órfãs (§1.4)** |
| `favorites.css` | **nenhum arquivo** |

**Resolução do item 2:** 2 dos 7 CSS não chegam ao navegador. `public.css` só é
importado pelas duas páginas sem rota, e `favorites.css` não é importado por
ninguém. Os estilos vivos são os 5 primeiros da tabela.

### 7.4 Tokens e breakpoints — `apps/frontend/tailwind.config.ts`

Breakpoints padrão intactos (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536)
mais três customizados já presentes no arquivo:

| Nome | Valor |
|---|---|
| `nb` | 1180px |
| `sidebar-full` | 1400px |
| `3xl` | 1728px |

Tokens de cor via CSS vars HSL: `--moria-black`, `--moria-orange`,
`--moria-orange-hover`, família `--gold-*`, `primary`, `secondary`, `border`,
`input`, `ring`, `background`, `foreground`.
Fontes: `heading` = Rajdhani, `body` = Inter.
`container` centralizado, padding 2rem, `2xl: 1400px`.
`content` inclui `../../packages/ui/**/*.{ts,tsx}`.

### 7.5 `packages/ui` (`@moria/ui`) — instalação de PWA

Componentes: `InstallBanner`, `InstallCard`, `IOSInstructions`, `IconSVG`,
`PWADebug`.
Hooks: `useDeviceDetection`, `useDevMode`, `useInstallPrompt`,
`usePWAAnalytics`, `usePWAInstall`.
Estilos: `pwa-install/styles/animations.css`. Utils: `utils/analytics.ts`.

### 7.6 Assets

`src/assets/` (4): `about-shop.jpg`, `car-parts.jpg`, `hero-bg.jpg`, `hero-garage.jpg`.
`public/` (4): `favicon.png`, `placeholder.svg`, `robots.txt`, `sw.js` (service worker).

---

## 8. Modais, dialogs e drawers

**47 arquivos de aplicação** contêm `<Dialog>`, `<Sheet>`, `<Drawer>`,
`<AlertDialog>` ou `ResponsiveDialog` (verificado por grep). Somando os 5
primitivos de `components/ui/` que definem essas peças (`dialog`, `sheet`,
`drawer`, `alert-dialog`, `responsive-dialog`), são 52 arquivos no total.

> Correção da revisão 2: o número "56" publicado antes nesta seção estava
> errado — era a contagem de `components/ui/` (§6), não a de modais.

### 8.1 Modais do admin (23 arquivos dedicados)

`CouponModal`, `CreateCustomerModal`, `CreateOrderModal`, `CreateQuoteModal`,
`CreateUserModal`, `CreateVehicleModal`, `CustomerOrdersModal`, `EditUserModal`,
`MechanicAssignmentModal`, `OrderDetailsModal`, `ProductCategoriesModal`,
`ProductModal`, `PromotionModal`, `QuickAddItemsModal`, `QuoteModal`,
`RevisionDetailsModal`, `ScheduleRevisionAppointmentModal`,
`ServiceCategoriesModal`, `ServiceModal`, `ServiceOrderDetailsModal`,
`ServiceOrderModal`, `AdminLoginDialog`, `PlateLookupOverlay` (overlay full-screen).

### 8.2 Modais do cliente (8)

`CreateVehicleModalCustomer`, `EditVehicleModalCustomer`, `DeleteVehicleDialog`,
`LoginDialog`, `RequestQuoteModal`, `RevisionDetailsDialog`,
`ScheduleRevisionModal`, `support/CreateTicketModal`.

### 8.3 Drawers (5)

`CartDrawer`, `CheckoutDrawer` (público) · `StoreMobileDrawer` (admin mobile) ·
`MobileDrawer` (cliente mobile) · `store/MobileModal`.

### 8.4 Dialogs embutidos em seções (não são arquivos de modal)

`AdminCouponsSection`, `AdminProductsSection`, `AdminPromotionsSection`,
`AdminServicesSection`, `LoyaltyManagement`, `ShippingMethodsManagement`,
`RelationshipSettings`, `MarketplaceConnectWizard`, `CustomerOrders`,
`CustomerProfile`, `ChecklistManager`, `CustomerSelector`, `VehicleSelector`,
`RevisionVehicleLookupDialog`, `ProductImageUpload`, `ImageUploaderWithCrop`,
`settings/PwaSettingsSection`, `support/TicketDetails`, `ui/ProductImageGallery`,
`ui/ImageUpload`.

---

## 9. Formulários

**Fato verificado:** apesar de `react-hook-form` + `zod` estarem instalados, o
**único arquivo que importa `useForm` é o primitivo `components/ui/form.tsx`**.
Todos os formulários da aplicação são **controlados à mão com `useState`**.

### 9.1 Com elemento `<form>` (17 arquivos)

| # | Formulário | Arquivo | Área |
|---|---|---|---|
| F1 | Contato da landing | `components/Contact.tsx` | Pública |
| F2 | Contato (página órfã) | `pages/Contact.tsx` | Órfã |
| F3 | Checkout | `components/CheckoutDrawer.tsx` | Pública / Cliente |
| F4 | Login admin | `admin/AdminLoginDialog.tsx` | Admin |
| F5 | Minha conta admin | `admin/AdminAccountContent.tsx` | Admin |
| F6 | Criar cliente | `admin/CreateCustomerModal.tsx` | Admin |
| F7 | Criar veículo (admin) | `admin/CreateVehicleModal.tsx` | Admin |
| F8 | Agendar revisão (admin) | `admin/ScheduleRevisionAppointmentModal.tsx` | Admin |
| F9 | Login / cadastro cliente | `customer/CustomerAuthCard.tsx` | Cliente |
| F10 | Perfil do cliente | `customer/CustomerProfile.tsx` | Cliente |
| F11 | Criar veículo (cliente) | `customer/CreateVehicleModalCustomer.tsx` | Cliente |
| F12 | Editar veículo (cliente) | `customer/EditVehicleModalCustomer.tsx` | Cliente |
| F13 | Solicitar orçamento | `customer/RequestQuoteModal.tsx` | Cliente |
| F14 | Agendar revisão (cliente) | `customer/ScheduleRevisionModal.tsx` | Cliente |
| F15 | Abrir chamado | `customer/support/CreateTicketModal.tsx` | Cliente |
| F16 | Mensagem no chamado | `customer/support/TicketChat.tsx` | Cliente |
| F17 | Avaliar atendimento | `customer/support/TicketRating.tsx` | Cliente |

### 9.2 Com `handleSubmit` / `onSubmit` sem `<form>` (6 adicionais)

| # | Formulário | Arquivo |
|---|---|---|
| F18 | Criar usuário | `admin/CreateUserModal.tsx` |
| F19 | Editar usuário | `admin/EditUserModal.tsx` |
| F20 | Atribuir mecânico | `admin/MechanicAssignmentModal.tsx` |
| F21 | Categorias de produto | `admin/ProductCategoriesModal.tsx` |
| F22 | Categorias de serviço | `admin/ServiceCategoriesModal.tsx` |
| F23 | Métodos de envio | `admin/ShippingMethodsManagement.tsx` |

### 9.3 Formulários-como-modal sem `<form>` nem `handleSubmit` (8) ✅ RESOLVIDO

Modais de edição pesados que submetem por `onClick` de botão — são formulários
na prática e precisam entrar na auditoria de UX de formulário.

**Resolução do item 5** — contagem por `grep` de `<Input|Textarea|Select|Checkbox|Switch|RadioGroup|RichTextEditor>`:

| # | Modal | Campos | Linhas |
|---|---|---|---|
| FM1 | `CreateQuoteModal` | **21** | 1.236 |
| FM2 | `PromotionModal` | **18** | 1.175 |
| FM3 | `ProductModal` | **17** | 1.067 |
| FM4 | `CreateOrderModal` | **17** | 1.379 |
| FM5 | `ServiceOrderModal` | **11** | 1.212 |
| FM6 | `CouponModal` | 9 | 570 |
| FM7 | `ServiceModal` | 6 | 419 |
| FM8 | `QuoteModal` | 3 | 537 |

**102 campos em 7.595 linhas.** Os 5 primeiros são as superfícies de formulário
mais densas do sistema e devem ter prioridade na auditoria de UX — nenhum deles
usa `<form>`, validação de schema ou `react-hook-form`.

> `QuoteModal` com 3 campos em 537 linhas indica que é majoritariamente
> visualização, não entrada. A confirmar na auditoria.

**Total: 23 formulários confirmados (F1–F23) + 8 modais-formulário = 31 superfícies de entrada de dados.**

### 9.4 Validação — **a camada existe e está inteiramente desconectada** ✅ RESOLVIDO

**Resolução do item 6.** Existem três artefatos de validação, e **nenhum é usado
pela aplicação**:

| Arquivo | Linhas | Conteúdo | Consumidores |
|---|---|---|---|
| `schemas/index.ts` | 313 | 9 enums + 9 schemas zod (Customer, Address, Product, Service, Order, OrderItem, Coupon, Promotion, Favorite) + variantes Create/Update + schemas de resposta + tipos derivados | **0** |
| `utils/validation.ts` | 710 | validadores + `useValidationMonitor` | só `hooks/useValidation.ts` |
| `hooks/useValidation.ts` | 315 | hook de validação | **0** |

Ou seja: **1.338 linhas de infraestrutura de validação sem um único consumidor.**
Combinado com §9 (nenhum formulário usa `react-hook-form`), a conclusão é que
**a aplicação não tem camada de validação ativa** — cada formulário valida à mão,
se validar.

> Isto é um achado de UX, não só de arquitetura: mensagens de erro, formatos de
> CPF/telefone/CEP e regras de obrigatoriedade estão definidos nos schemas mortos
> e podem estar inconsistentes com o que cada formulário realmente faz.

---

## 10. Listas e tabelas

### 10.1 Tabelas HTML / `<Table>` — **5 arquivos, apenas 3 telas reais**

| # | Onde | Arquivo |
|---|---|---|
| T1 | Usuários do admin | `admin/AdminUsersSection.tsx` |
| T2 | Fidelidade | `admin/LoyaltyManagement.tsx` |
| T3 | Especificações do produto (público) | `components/ProductSpecifications.tsx` |
| — | HOC tabela → cards no mobile | `store/withMobileCards.tsx` |
| — | Primitivo | `ui/table.tsx` |

> Praticamente **não há tabelas** neste sistema: as listagens são grids de card.

### 10.2 Listas (renderização por `.map`) — top 20 por densidade

| Arquivo | Ocorrências de `.map(` |
|---|---|
| `admin/ServiceOrderModal.tsx` | 14 |
| `admin/AdminContent.tsx` | 13 |
| `components/AdvancedFilters.tsx` | 13 (código órfão) |
| `customer/CustomerFavorites.tsx` | 12 |
| `admin/RelationshipSettings.tsx` | 11 |
| `admin/CreateOrderModal.tsx` | 11 |
| `components/Promotions.tsx` | 11 |
| `revisions/steps/StepChecklist.tsx` | 10 |
| `admin/CreateQuoteModal.tsx` | 10 |
| `pages/About.tsx` | 8 (órfã) |
| `ui/ImageUpload.tsx` | 8 |
| `customer/CustomerRevisions.tsx` | 8 |
| `admin/QuickAddItemsModal.tsx` | 8 |
| `components/CheckoutDrawer.tsx` | 8 |
| `admin/RelationshipDashboard.tsx` | 7 |
| `admin/QuoteModal.tsx` | 7 |
| `admin/PromotionModal.tsx` | 7 |
| `pages/MyAccount.tsx` | 6 |
| `pages/Contact.tsx` | 6 (órfã) |
| `admin/AdminSupportContent.tsx` | 6 |

**Listagens principais por painel** (a auditar tela a tela):

- **Admin (14):** pedidos, orçamentos, ordens de serviço, revisões, agendamentos,
  produtos, serviços, clientes, cupons, promoções, usuários, marketplaces,
  chamados, campanhas de relacionamento.
- **Cliente (8):** orçamentos, pedidos, veículos, revisões, favoritos, cupons,
  chamados, FAQ.
- **Mecânico (2):** revisões, ordens de serviço.
- **Público (5):** produtos, serviços, promoções, depoimentos, destaques.

---

## 11. Navegação

| # | Mecanismo | Arquivo | Contexto | Itens |
|---|---|---|---|---|
| N1 | Sidebar do admin | `admin/Sidebar.tsx` | desktop `/store-panel` | 20, em 5 seções |
| N2 | Bottom nav do admin | `store/StoreBottomNavigation.tsx` + `adminBottomNavItems` | mobile `/store-panel` | 4 (Início, Pedidos, Clientes, Mais) + botão central de consulta por placa |
| N3 | Drawer "Mais" do admin | `store/StoreMobileDrawer.tsx` | mobile | os 20 itens da sidebar |
| N4 | Header do admin | `store/StoreHeader.tsx` + `admin/AdminHeader.tsx` | mobile / desktop | busca, notificações, conta |
| N5 | Bottom nav do cliente | `customer/BottomNavigation.tsx` | mobile `/customer` | 5 (Início, Orçamentos, Pedidos, Revisões, Mais) |
| N6 | Drawer do cliente | `customer/MobileDrawer.tsx` | mobile | 9 abas |
| N7 | Menu lateral do cliente | `customer/CustomerLayout.tsx` (`md:col-span-1`) | desktop | 9 abas |
| N8 | Sidebar do mecânico | `mechanic/MechanicSidebar.tsx` | `/mechanic-panel` | 3, com estado de colapso |
| N9 | Navbar público | `components/Navbar.tsx` + `NavLink.tsx` | landing | âncoras de seção |
| N10 | Footer público | `m2/components/Footer.tsx` (e `components/Footer.tsx`) | landing | links |
| N11 | Roteamento por slug | `adminNavigation.ts`, `customerNavigation.ts`, `mechanicNavigation.ts` | todos | `tabFromSlug` / `slugFromTab` |
| N12 | Central de notificações | `admin/NotificationCenter.tsx` | admin | — |
| N13 | Guardas de rota | `admin/ProtectedAdminRoute.tsx`, `mechanic/ProtectedMechanicRoute.tsx` | admin / mecânico | — |
| N14 | FAB WhatsApp | `components/WhatsAppFAB.tsx` | landing | — |
| N15 | Banner de instalação PWA | `pwa/PwaInstallBanner.tsx` + `@moria/ui` | todos | — |

---

## 12. Fluxos de usuário identificados

Derivados das rotas, abas e modais acima. **14 fluxos principais.**

| # | Fluxo | Telas envolvidas |
|---|---|---|
| FL1 | Visitante navega a landing e pede orçamento pelo WhatsApp | `/` → `WhatsAppFAB` / `Contact` |
| FL2 | Compra pública (carrinho → checkout) | `/` → `CartDrawer` → `CheckoutDrawer` → `CouponInput` |
| FL3 | Cadastro / login do cliente | `/customer-login` → `CustomerAuthCard` → `/customer/inicio` |
| FL4 | Cliente solicita orçamento | `/customer/orcamentos` → `RequestQuoteModal` |
| FL5 | Cliente gerencia veículos | `/customer/veiculos` → Create / Edit / Delete Vehicle |
| FL6 | Cliente agenda revisão e acompanha | `/customer/revisoes` → `ScheduleRevisionModal` → `RevisionDetailsDialog` |
| FL7 | Cliente abre e acompanha chamado | `/customer/suporte` → `CreateTicketModal` → `TicketChat` → `TicketRating` |
| FL8 | Cliente usa favoritos e cupons | `/customer/favoritos`, `/customer/cupons` |
| FL9 | Login do lojista | `/admin-login` → `/store-panel/dashboard` |
| FL10 | Lojista cria pedido / orçamento / OS | `/store-panel/pedidos` \| `orcamentos` \| `ordens-de-servico` → modais de criação |
| FL11 | Abertura de revisão (wizard de 4 passos) | `/store-panel/revisoes` → `NewRevisionFlow` → StepPlate → StepCustomer → StepChecklist → StepBudget |
| FL12 | Consulta por placa | botão central do bottom nav → `PlateLookupOverlay` (e `RevisionVehicleLookupDialog`) |
| FL13 | Lojista edita a landing page | `/store-panel/landing-page` → `LandingPageContent` → 11 SectionEditors + 9 StyleControls |
| FL14 | Mecânico executa revisão / OS | `/mechanic-panel/revisoes` \| `ordens-de-servico` |

**Fluxos secundários:** aprovação pública de orçamento (`/quote-approval/:token`),
instalação do PWA (`/pwa-entry`, `/pwa-admin`), gestão de usuários e permissões,
campanhas de relacionamento, conexão de marketplace (`MarketplaceConnectWizard`),
fidelidade (`LoyaltyManagement`).

---

## 13. Testes e ferramentas de browser testing

| Item | Situação |
|---|---|
| Runner do frontend | **Vitest 3.2** (`apps/frontend/vitest.config.ts` + `vite.config.ts`) |
| Testes existentes no frontend | **2 arquivos**: `components/customer/CustomerFavorites.test.tsx`, `test/example.test.ts` |
| Testing Library | instalada (`@testing-library/react`, `@testing-library/jest-dom`, `jsdom`) |
| Playwright no frontend | **não existe** |
| Playwright em outros pacotes | `apps/backend` (1.59.1) e `services/plate-scraper` (1.49.1) — uso de scraping, não de teste de UI |
| Cypress / Puppeteer | **não existem** em nenhum pacote |
| Teste visual / regressão de layout | **não existe** |
| Testes do app Flutter | `apps/mobile/test/widget_test.dart` |

> Cobertura de teste de UI web: **praticamente zero** (1 teste de componente).
> Qualquer medição responsiva nas próximas etapas dependerá de ferramenta ad hoc.

---

## 14. App Flutter — `apps/mobile` (UI separada, fora do escopo web)

Registrado para não ser esquecido; **não é React e não compartilha componentes**
com o frontend web.

`lib/main.dart`, `lib/app/router.dart`, `lib/app/sections.dart`,
`lib/core/theme/app_theme.dart`, `lib/core/api/*`,
`lib/core/auth/token_storage.dart`, `lib/core/providers.dart`, `lib/core/env.dart`,
`lib/features/auth/login_screen.dart`, `lib/features/auth/auth_controller.dart`,
`lib/features/dashboard/home_shell.dart`,
`lib/features/plate_lookup/plate_lookup_screen.dart`,
`lib/features/section_placeholder.dart`.

---

## 15. Código sem referência (registrado, não removido)

Verificado por `grep` de import em todo `apps/frontend/src`. Linhas contadas com `wc -l`.

**A resolução dos 7 itens (§18) mais que dobrou este inventário.** A primeira
versão listava ~2.500 linhas; o total confirmado é **7.108 linhas**.

### 15.1 Páginas órfãs (1.098 linhas)

| Arquivo | Linhas | Referências |
|---|---|---|
| `pages/Contact.tsx` | 503 | 0 |
| `pages/About.tsx` | 322 | 0 |
| `pages/Promocoes.tsx` | 273 | 0 |

### 15.2 Componentes públicos duplicados + barrel (1.345 linhas) — **NOVO em §18**

Duplicatas das versões vivas em `m2/components/`. Só o barrel morto os referencia.

| Arquivo | Linhas |
|---|---|
| `components/Products.tsx` | 438 |
| `components/Promotions.tsx` | 353 |
| `components/Services.tsx` | 215 |
| `components/Footer.tsx` | 181 |
| `components/Hero.tsx` | 133 |
| `components/index.ts` (barrel sem consumidor) | 25 |

### 15.3 Ramo da sidebar shadcn (803 linhas) — **NOVO em §18**

| Arquivo | Linhas | Situação |
|---|---|---|
| `components/ui/sidebar.tsx` | 761 | usado só por `AdminHeader` |
| `components/admin/AdminHeader.tsx` | 42 | **0 referências** |

`SidebarProvider` não é usado em lugar nenhum. O header real é `store/StoreHeader.tsx`.

### 15.4 Camada de validação (1.338 linhas) — **NOVO em §18**

| Arquivo | Linhas | Situação |
|---|---|---|
| `utils/validation.ts` | 710 | só por `hooks/useValidation.ts` |
| `hooks/useValidation.ts` | 315 | **0 referências** |
| `schemas/index.ts` | 313 | **0 referências** |

### 15.5 Sistema de filtros (1.773 linhas)

| Arquivo | Linhas | Situação |
|---|---|---|
| `components/AdvancedFilters.tsx` | 772 | só por `SmartFilters` |
| `hooks/useAdvancedFilters.ts` | 522 | só por `SmartFilters` |
| `components/SmartFilters.tsx` | 479 | **0 referências** |

### 15.6 Arquivos residuais versionados (618 linhas)

| Arquivo | Linhas |
|---|---|
| `customer/LoginDialog.tsx.bak` | 357 |
| `admin/RevisionsListContent.old.tsx` | 261 |

### 15.7 Outros

| Item | Linhas | Situação |
|---|---|---|
| `utils/masks.ts` | 133 | **0 referências** |
| `styles/favorites.css` | — | **0 referências** (§7.3) |
| `styles/public.css` | — | só pelas páginas órfãs (§7.3) |
| `layout/ResponsiveGrids.tsx` → `PageContainer`, `CardGrid`, `ActionRow` | — | 0 (só `StatGrid` tem consumidor) |

### 15.8 Total

| Bloco | Linhas |
|---|---|
| Sistema de filtros | 1.773 |
| Camada de validação | 1.338 |
| Componentes duplicados + barrel | 1.345 |
| Páginas órfãs | 1.098 |
| Ramo da sidebar shadcn | 803 |
| Arquivos `.bak` / `.old` | 618 |
| `utils/masks.ts` | 133 |
| **TOTAL** | **7.108 linhas** |

> **Nada foi apagado.** Remoção depende de confirmação do usuário.
>
> Relevância para a auditoria: **7.108 linhas que não precisam ser auditadas**,
> desde que a remoção (ou pelo menos a marcação) seja decidida antes da próxima
> etapa. Auditar responsividade de `components/Products.tsx` ou de
> `pages/Contact.tsx` seria esforço perdido.

---

## 15-B. Matriz consolidada por ID

Formato pedido: `ID | Area | Rota | Tela/Componente | Arquivos | Tipo |
Publico/Privado | Responsivo? | Formulario? | Lista/Tabela? | Fluxos | Estado`.

**Dois eixos de estado, propositalmente separados:**

- **Descoberta** - `FOUND` (existe e foi confirmado no codigo) / `NOT VERIFIED`
  (nao foi possivel confirmar) / `NOT APPLICABLE`.
- **Auditoria** - `PENDING` / `AUDITED` / `NOT APPLICABLE`. Nesta etapa quase
  tudo e `PENDING` por definicao: o inventario nao audita.

Coluna **Responsivo?**: `shell` = herda o comportamento responsivo do shell da
rota; `proprio` = o arquivo traz as proprias classes de breakpoint; `medido` =
ja verificado em navegador em `RESPONSIVE-UX-AUDIT.md`. **Nenhum valor aqui
afirma que a tela esta responsiva corretamente** - so diz de onde vem o
comportamento. Julgar e a proxima etapa.

### 15-B.1 Paginas

| ID | Area | Rota | Tela/Componente | Arquivos | Tipo | Pub/Priv | Responsivo? | Form? | Lista/Tabela? | Fluxos | Descoberta | Auditoria |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Landing | `/` | `Index` | `pages/Index.tsx` + 13 secoes | pagina | Publico | medido | sim (Contact) | listas | FL1, FL2 | FOUND | PENDING |
| P2 | Cliente | `/customer-login/*` | `CustomerLoginPage` | `pages/CustomerLoginPage.tsx`, `customer/CustomerAuthCard.tsx` | pagina | Publico | proprio | sim | - | FL3 | FOUND | PENDING |
| P3 | Admin | `/admin-login/*` | `AdminLoginPage` | `pages/AdminLoginPage.tsx`, `admin/AdminLoginDialog.tsx` | pagina | Publico | proprio | sim | - | FL9 | FOUND | PENDING |
| P4 | PWA | `/pwa-entry` | `PwaEntryPage` | `pages/PwaEntryPage.tsx` | pagina | Publico | proprio | - | - | sec. PWA | FOUND | PENDING |
| P5 | PWA | `/pwa-admin` | `PwaAdminInstallPage` | `pages/PwaAdminInstallPage.tsx` | pagina | Publico | proprio | - | - | sec. PWA | FOUND | PENDING |
| P6 | Orcamento | `/quote-approval/:token` | `PublicQuoteApprovalPage` | `pages/PublicQuoteApprovalPage.tsx` | pagina | Publico (token) | proprio | sim | lista de itens | sec. aprovacao | FOUND | PENDING |
| P7 | Erro | `*` | `NotFound` | `pages/NotFound.tsx` | pagina de erro | Publico | proprio | - | - | - | FOUND | PENDING |
| P8 | Cliente | `/customer/:tab` | `CustomerPanel` | `pages/CustomerPanel.tsx` | shell de abas | Privado | shell (L2) | por aba | por aba | FL4-FL8 | FOUND | PENDING |
| P9 | Cliente | `/my-account` | `MyAccount` | `pages/MyAccount.tsx` (597 l.) | pagina | Privado | proprio | sim | 6 `.map` | FL3 | FOUND | PENDING |
| P10 | Admin | `/store-panel/:tab` | `StorePanel` | `pages/StorePanel.tsx` | shell de abas | Privado | shell (L1) | por aba | por aba | FL10-FL13 | FOUND | PENDING |
| P11 | Mecanico | `/mechanic-panel/:tab` | `MechanicPanelPage` | `pages/MechanicPanelPage.tsx`, `mechanic/MechanicPanel.tsx` | shell de abas | Privado | shell (L3) | por aba | por aba | FL14 | FOUND | PENDING |
| P12 | Orfa | *(sem rota)* | `About` | `pages/About.tsx` (322 l.) | pagina orfa | - | - | - | - | - | FOUND (orfa) | NOT APPLICABLE |
| P13 | Orfa | *(sem rota)* | `Contact` | `pages/Contact.tsx` (503 l.) | pagina orfa | - | - | sim | - | - | FOUND (orfa) | NOT APPLICABLE |
| P14 | Orfa | *(sem rota)* | `Promocoes` | `pages/Promocoes.tsx` (273 l.) | pagina orfa | - | - | - | lista | - | FOUND (orfa) | NOT APPLICABLE |

### 15-B.2 Abas do painel admin - `/store-panel/:slug`

Todas: Area **Admin**, Pub/Priv **Privado**, Responsivo **shell (L1)**,
Descoberta **FOUND**, Auditoria **PENDING**.

| ID | Rota | Tela/Componente | Arquivos | Tipo | Form? | Lista/Tabela? | Fluxos |
|---|---|---|---|---|---|---|---|
| A1 | `/store-panel/dashboard` | Dashboard | `admin/AdminContent.tsx` (inline) | KPIs + listas | - | listas | FL10 |
| A2 | `/store-panel/pedidos` | Pedidos | `AdminContent` inline, `OrderDetailsModal`, `CreateOrderModal` | lista + modais | modal | lista | FL10 |
| A3 | `/store-panel/orcamentos` | Orcamentos | `AdminContent` inline, `QuoteModal`, `CreateQuoteModal` | lista + modais | modal | lista | FL10 |
| A4 | `/store-panel/ordens-de-servico` | Ordens de Servico | `ServiceOrdersContent`, `ServiceOrderModal`, `ServiceOrderDetailsModal`, `MechanicAssignmentModal` | lista + modais | modal | lista | FL10, FL14 |
| A5 | `/store-panel/revisoes` | Revisoes (3 sub-views) | `RevisionAppointmentsContent`, `RevisionsListContent`, `NewRevisionFlow` + 4 steps | wizard + listas | sim | lista | FL11 |
| A6 | `/store-panel/produtos` | Produtos | `AdminProductsSection`, `ProductModal`, `ProductCategoriesModal`, `ProductImageUpload` | grid + modais | modal | grid | FL10 |
| A7 | `/store-panel/servicos` | Servicos | `AdminServicesSection`, `ServiceModal`, `ServiceCategoriesModal` | grid + modais | modal | grid | FL10 |
| A8 | `/store-panel/marketplaces` | Marketplaces | `MarketplacesContent`, `MarketplaceConnectWizard`, `ProductMarketplacePanel` | wizard | sim | lista | sec. marketplace |
| A9 | `/store-panel/clientes` | Clientes | `AdminContent` inline, `CreateCustomerModal`, `CustomerOrdersModal` | lista + modais | modal | lista | FL10 |
| A10 | `/store-panel/relacionamento` | Relacionamento | `CustomerRelationshipContent`, `RelationshipDashboard`, `RelationshipSettings` | abas + config | sim | lista | sec. campanhas |
| A11 | `/store-panel/suporte` | Suporte | `AdminSupportContent` | lista + chat | sim | lista | FL7 |
| A12 | `/store-panel/fidelidade` | Fidelidade | `LoyaltyManagement` | abas + tabela | sim | **tabela** | sec. fidelidade |
| A13 | `/store-panel/cupons` | Cupons | `AdminCouponsSection`, `CouponModal` | grid + modal | modal | grid | sec. marketing |
| A14 | `/store-panel/promocoes` | Promocoes | `PromotionsManagement`, `AdminPromotionsSection`, `AdminPromotionsOverview`, `PromotionModal` | grid + modal | modal | grid | sec. marketing |
| A15 | `/store-panel/landing-page` | Landing Page | `LandingPageContent` + 11 SectionEditors + 9 StyleControls | editor | sim | lista | FL13 |
| A16 | `/store-panel/minha-conta` | Minha Conta | `AdminAccountContent` | abas + form | **sim (`<form>`)** | - | - |
| A17 | `/store-panel/relatorios` | Relatorios | `AdminContent` inline, `AdminReportsSection` | KPIs + graficos | - | listas | sec. relatorios |
| A18 | `/store-panel/pwa` | PWA | `PwaSettingsContent`, `settings/PwaSettingsSection` | config | sim | - | sec. PWA |
| A19 | `/store-panel/configuracoes` | Configuracoes | `SettingsContent`, `settings/PdfBrandingSection`, `settings/PlateLookupSection`, `ShippingMethodsManagement` | config | sim | lista | sec. config |
| A20 | `/store-panel/usuarios` | Usuarios (perm. `canManageAdmins`) | `AdminUsersSection`, `CreateUserModal`, `EditUserModal` | **tabela** + modais | modal | **tabela** | sec. usuarios |

### 15-B.3 Abas do painel do cliente - `/customer/:slug`

Todas: Area **Cliente**, Pub/Priv **Privado**, Responsivo **shell (L2)**,
Descoberta **FOUND**, Auditoria **PENDING**.

| ID | Rota | Tela/Componente | Arquivos | Tipo | Form? | Lista/Tabela? | Fluxos |
|---|---|---|---|---|---|---|---|
| C1 | `/customer/inicio` | Dashboard | `customer/CustomerDashboard.tsx` | KPIs + atalhos | - | listas | FL3 |
| C2 | `/customer/perfil` | Perfil | `CustomerProfile.tsx` | abas + form | **sim (`<form>`)** | - | FL3 |
| C3 | `/customer/orcamentos` | Orcamentos | `CustomerQuotes.tsx`, `RequestQuoteModal` | lista + modal | **sim** | lista | FL4 |
| C4 | `/customer/pedidos` | Pedidos | `CustomerOrders.tsx` | lista + dialog | - | lista | FL2 |
| C5 | `/customer/veiculos` | Veiculos | `CustomerVehicles.tsx`, `CreateVehicleModalCustomer`, `EditVehicleModalCustomer`, `DeleteVehicleDialog` | lista + modais | **sim** | lista | FL5 |
| C6 | `/customer/revisoes` | Revisoes | `CustomerRevisions.tsx`, `ScheduleRevisionModal`, `RevisionDetailsDialog` | abas + modais | **sim** | lista | FL6 |
| C7 | `/customer/favoritos` | Favoritos | `CustomerFavorites.tsx`, `FavoriteButton`, `FavoriteNotificationSettings` | grid | - | grid | FL8 |
| C8 | `/customer/cupons` | Cupons | `CustomerCoupons.tsx` | lista | - | lista | FL8 |
| C9 | `/customer/suporte` | Suporte | `support/SupportDashboard` + 10 componentes | abas + chat | **sim** | lista | FL7 |

### 15-B.4 Abas do painel do mecanico - `/mechanic-panel/:slug`

Todas: Area **Mecanico**, Pub/Priv **Privado**, Responsivo **shell (L3)**,
Descoberta **FOUND**, Auditoria **PENDING**.

| ID | Rota | Tela/Componente | Arquivos | Tipo | Form? | Lista/Tabela? | Fluxos |
|---|---|---|---|---|---|---|---|
| M1 | `/mechanic-panel/revisoes` | Minhas Revisoes | `mechanic/MechanicRevisionsView.tsx` | abas + lista | - | lista | FL14 |
| M2 | `/mechanic-panel/ordens-de-servico` | Minhas OS | `mechanic/MechanicServiceOrdersView.tsx` | lista | - | lista | FL14 |
| M3 | `/mechanic-panel/perfil` | Perfil | `mechanic/MechanicSettingsView.tsx` | abas + form | sim | - | FL14 |

> **Observacao de rota, nao de auditoria:** `pages/StorePanel.tsx:47` faz com que
> um admin `STAFF` receba `MechanicPanel` em `/store-panel`. As telas M1-M3 sao
> portanto alcancaveis por duas URLs distintas.

### 15-B.5 Shells, navegacao e estados de sistema

| ID | Area | Rota | Tela/Componente | Arquivos | Tipo | Pub/Priv | Responsivo? | Fluxos | Descoberta | Auditoria |
|---|---|---|---|---|---|---|---|---|---|---|
| L1 | Admin | `/store-panel/*` | `StoreLayout` | `store/StoreLayout.tsx` + `StoreHeader`, `StoreBottomNavigation`, `StoreMobileDrawer`, `admin/Sidebar` | shell | Privado | medido (fork JS + rail 72px) | FL10-FL13 | FOUND | PENDING |
| L2 | Cliente | `/customer/*` | `CustomerLayout` | `customer/CustomerLayout.tsx` + `BottomNavigation`, `MobileDrawer` | shell | Privado | medido (grid `md:`/`nb:`) | FL4-FL8 | FOUND | PENDING |
| L3 | Mecanico | `/mechanic-panel/*` | `MechanicPanel` | `mechanic/MechanicPanel.tsx`, `MechanicSidebar.tsx` | shell | Privado | proprio (reusa `StoreLayout`) | FL14 | FOUND | PENDING |
| N1 | Admin | - | Sidebar / rail | `admin/Sidebar.tsx`, `admin/adminNavigation.ts` | navegacao | Privado | medido | - | FOUND | PENDING |
| N2 | Admin | - | Bottom nav + drawer | `store/StoreBottomNavigation.tsx`, `store/StoreMobileDrawer.tsx` | navegacao | Privado | proprio | FL12 | FOUND | PENDING |
| N3 | Cliente | - | Bottom nav + drawer | `customer/BottomNavigation.tsx`, `customer/MobileDrawer.tsx` | navegacao | Privado | proprio | - | FOUND | PENDING |
| N4 | Landing | `/` | Navbar | `components/Navbar.tsx`, `components/NavLink.tsx` | navegacao | Publico | proprio | FL1 | FOUND | PENDING |
| S1 | Global | todas | Erro de render | `components/ErrorBoundary.tsx` | estado de erro | ambos | - | - | FOUND | PENDING |
| S2 | Global | `*` | 404 | `pages/NotFound.tsx` | estado de erro | Publico | proprio | - | FOUND | PENDING |
| S3 | Global | - | Loading de auth | spinners inline em `CustomerPanel`, `CustomerLoginPage`, `AdminLoginPage` | estado de loading | ambos | - | - | FOUND | PENDING |
| S4 | Global | - | Skeletons | `ui/skeleton.tsx` - **1 consumidor vivo** (`CustomerFavorites`); o outro import vem de `ui/sidebar.tsx`, que e orfao | estado de loading | ambos | - | - | FOUND | PENDING |
| S5 | Global | - | Empty state | `ui/empty-state.tsx` - **0 consumidores** | estado vazio | ambos | - | - | FOUND (orfao) | PENDING |
| S6 | Global | - | Toasts | `ui/toaster.tsx`, `ui/sonner.tsx`, `hooks/use-toast.ts` | feedback | ambos | - | - | FOUND | PENDING |
| S7 | Admin | - | Guard de rota | `admin/ProtectedAdminRoute.tsx`, `mechanic/ProtectedMechanicRoute.tsx` | guard | Privado | NOT APPLICABLE | - | FOUND | PENDING |

> **S5 e um achado, nao um detalhe:** existe um primitivo de empty state e
> nenhuma tela o usa. Cada lista resolve "sem resultados" por conta propria -
> item natural da auditoria de consistencia. O mesmo vale para S4: um unico
> consumidor de skeleton em todo o app.

---

## 16. Matriz de cobertura

| Área | Encontrada | Inventariada | Pronta para auditoria |
|---|---|---|---|
| Páginas públicas | ✅ 7 rotas | ✅ §1.1 | ✅ |
| Páginas privadas | ✅ 4 rotas / 32 abas | ✅ §1.2, §3 | ✅ |
| Layouts | ✅ 3 shells + 4 próprios | ✅ §2 | ✅ |
| Componentes | ✅ ~300 arquivos | ✅ §4–§7 | ✅ (§4.2 e §6 resolvidos) |
| Formulários | ✅ 23 + 8 modais-form (102 campos) | ✅ §9 | ✅ (§9.3 resolvido) |
| Listas | ✅ mapeadas por densidade e por painel | ✅ §10.2 | ✅ |
| Tabelas | ✅ 3 telas reais | ✅ §10.1 | ✅ |
| Modais | ✅ 47 de aplicação (52 com primitivos) | ✅ §8 | ✅ |
| Navegação | ✅ 15 mecanismos | ✅ §11 | ✅ |
| Fluxos | ✅ 14 principais + 6 secundários | ✅ §12 | ✅ |
| Tokens / Tailwind | ✅ | ✅ §7.4 | ✅ |
| Estilos CSS | ✅ 7 arquivos (5 vivos) | ✅ §7.3 | ✅ (§7.3 resolvido) |
| Assets | ✅ 8 arquivos | ✅ §7.6 | ✅ |
| Hooks de UI | ✅ 34 | ✅ §7.1 | ✅ |
| Contextos | ✅ 6 | ✅ §7.2 | ✅ |
| Camada de dados / utils | ✅ 32 services + 7 lib + 6 types + 16 utils | ✅ §18.7 | ✅ (§18 item 7) |
| Validação | ✅ existe, **desconectada** | ✅ §9.4 | ✅ |
| Código órfão | ✅ 7.108 linhas | ✅ §15 | ⚠️ **aguarda decisão de remoção** |
| Testes de UI | ✅ 2 arquivos | ✅ §13 | ✅ |
| Browser testing | ✅ ausente no frontend | ✅ §13 | ✅ |
| App Flutter | ✅ | ✅ §14 | ➖ fora do escopo web |

**Nenhum item permanece `NÃO VERIFICADO`.** Os 7 pendentes da revisão 1 estão
resolvidos em §18.

---

## 16-B. Contagens finais (regra de cobertura)

Todos os numeros abaixo vem de leitura de codigo ou de `grep`/`wc` reproduziveis,
nao de documentacao previa.

| Metrica | Total | Como foi contado |
|---|---|---|
| **Rotas** | **17** = 11 rotas com elemento + 6 redirects | `<Route>` em `App.tsx` |
| **Telas / paginas navegaveis** | **43** = 7 publicas + 4 privadas de topo + 20 abas admin + 9 abas cliente + 3 abas mecanico | §1, §3 (as abas de topo P8/P10/P11 nao sao recontadas como tela) |
| **Paginas orfas (sem rota)** | **3** | `About`, `Contact`, `Promocoes` - §1.4 |
| **Componentes relevantes** | **193 `.tsx` de aplicacao** + 56 primitivos `ui/` = **249 `.tsx`** | `find src -name '*.tsx'` |
| **Formularios** | **23** com `<form>`/`useForm` + **8** modais-formulario sem `<form>` = **31** (102 campos) | §9.1, §9.2, §9.3 |
| **Listas / tabelas** | **3 telas com tabela real** (A12, A20, `ProductSpecifications`) + listas por `.map` mapeadas em §10.2 | §10 |
| **Modais / drawers** | **47 arquivos de aplicacao** (52 contando os 5 primitivos) | §8 |
| **Fluxos** | **14 principais + 6 secundarios = 20** | §12 |
| **Shells de layout** | **3** (+4 conjuntos com layout proprio) | §2 |
| **Hooks de UI** | **34** | §7.1 |
| **Contextos** | **6** | §7.2 |
| **Services de API** | **32 arquivos** (29 services + client/errorHandler/barrel) | §18.7 |
| **Codigo orfao** | **7.108 linhas** | §15.8 |

### Itens PENDING

**Tudo que esta em 15-B esta `PENDING` na auditoria** - 43 telas, 3 shells,
4 mecanismos de navegacao e 7 estados de sistema. Isso e esperado: esta etapa
inventaria, nao audita.

**Descoberta:** nenhum item permanece `NOT VERIFIED`. Os 7 pendentes da revisao 1
foram resolvidos em §18.

### Sobre a expressao "inventario completo"

A cobertura de **descoberta** esta fechada: todas as rotas de `App.tsx`, todas as
abas dos tres paineis e todos os diretorios de `apps/frontend/src` foram
percorridos, e nao restou item `NOT VERIFIED`.

Duas ressalvas honestas, para que o termo nao seja lido como mais forte do que e:

1. **O escopo e o frontend web.** O app Flutter (`apps/mobile`, 20 arquivos
   `.dart`) foi identificado em §14 mas nao inventariado tela a tela, e o
   backend so foi mapeado no nivel de rotas de API.
2. **Contagem de listas por `.map`** foi feita por densidade (§10.2, top 20), nao
   exaustivamente. Todas as telas que contem listas estao identificadas; o
   numero exato de listas dentro de cada tela, nao.

---

## 17. Gate

**Nada foi implementado, corrigido ou refatorado.** Este documento é apenas o
inventário.

Antes da próxima etapa resta **uma decisão do usuário**, não uma verificação:
o que fazer com as 7.108 linhas de código órfão de §15 (remover, marcar como
deprecated, ou deixar e apenas excluir do escopo da auditoria).

---

## 18. Resolução dos 7 itens `NÃO VERIFICADO` (revisão 2)

Todos verificados por `grep` de import em `apps/frontend/src` e `wc -l`.

| # | Item | Resultado | Onde |
|---|---|---|---|
| 1 | Consumidores das duplicatas da raiz | **Órfãs.** Só o barrel `components/index.ts`, que também não tem consumidor. 1.345 linhas mortas | §4.2, §15.2 |
| 2 | `public.css` / `favorites.css` | `public.css` só pelas 2 páginas órfãs; `favorites.css` por ninguém | §7.3 |
| 3 | `ui/sidebar.tsx` | 1 consumidor (`AdminHeader`), que **também é órfão**; `SidebarProvider` nunca usado. 803 linhas mortas | §6, §15.3 |
| 4 | Cobertura de `AdminPageHeader` | **17 consumidores** — confere com `RESPONSIVE-UX-AUDIT.md`. 9 seções ficam de fora | §2.2 |
| 5 | Campos por modal pesado | **102 campos em 7.595 linhas**; top 5: CreateQuote 21, Promotion 18, Product 17, CreateOrder 17, ServiceOrder 11 | §9.3 |
| 6 | `schemas/` e `useValidation` | **1.338 linhas sem nenhum consumidor** — a aplicação não tem validação ativa | §9.4, §15.4 |
| 7 | `api/`, `config/`, `lib/`, `types/`, `utils/` | Inventariado abaixo (§18.7) | §18.7 |

### 18.7 Camada de dados e utilitários (item 7)

Sem impacto direto de layout, mas confirmado para fechar a cobertura.

**`src/api/` — 32 arquivos.** `apiClient.ts`, `errorHandler.ts`, `index.ts`
(barrel **usado**, ex.: `contexts/AuthContext.tsx`, hooks de admin) + 29 services:
`addressService`, `adminService`, `authService`, `checklistService`, `cmsService`,
`couponService`, `customerService`, `faqService`, `favoriteService`, `fipeService`,
`guestOrderService`, `landing`, `loyaltyService`, `marketplaceService`,
`offerService`, `orderService`, `productService`, `promotionCalculatorService`,
`promotionService`, `reportsService`, `revisionAppointmentService`,
`revisionService`, `serviceOrderService`, `serviceService`, `settingsService`,
`shippingService`, `supportService`, `uploadService`, `vehicleService`.

**`src/lib/` — 7 arquivos**, com contagem de arquivos que os importam:

| Arquivo | Consumidores |
|---|---|
| `utils.ts` (`cn()`) | **66** |
| `format.ts` | **30** |
| `storefront-helpers.ts` | 14 |
| `passwordUtils.ts` | 7 |
| `apiError.ts` | 4 |
| `storefront-fallbacks.ts` | 3 |
| `storefront-client.ts` | 1 |

**`src/types/` — 6 arquivos:** `landingPage` (18 consumidores), `revisions` (10),
`promotions` (7), `storefront` (6), `specifications` (3), `vehicles` (2).

**`src/config/` — 1 arquivo:** `environment.ts` (1 consumidor).

**`src/utils/` — 16 arquivos:** `licensePlate` (4), `imageUrl` (3),
`specifications` (3), `colorHelpers` (3), `quotePdf` (2), `reportPdf` (2),
`orderWhatsApp` (2), `vehicles` (2), e com 1 consumidor cada: `formatters`,
`exportUtils`, `landingPageDefaults`, `pwaManifest`, `orderPdf`, `revisionPdf`,
`customerPdf`, `validation`. **`masks.ts` tem 0 consumidores** (§15.7).

> Nota: `utils/formatters.ts` (1 consumidor) e `lib/format.ts` (30 consumidores)
> coexistem. Possível duplicação de formatação — a confirmar na próxima etapa.

### 18.8 Hooks — barrel quase morto

`hooks/index.ts` reexporta 12 hooks, mas tem **um único consumidor**:
`customer/FavoriteNotificationSettings.tsx:6`. Todo o resto do projeto importa
os hooks pelo caminho direto.
