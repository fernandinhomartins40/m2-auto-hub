# Auditoria do Sistema de Componentes — m2-auto-hub

> **Etapa de auditoria. Nada foi implementado, removido ou refatorado.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §4, §5, §6, §7 e §15.
>
> **Método:** leitura de código e `grep` de import sobre `apps/frontend/src`
> (249 arquivos `.tsx`). Toda contagem aqui é reproduzível por comando. Onde o
> inventário afirmava algo, **reverifiquei contra o código** em vez de copiar —
> e em dois pontos o resultado diverge do que estava escrito (§8).
>
> Data: 17/09/2026 · Base: branch `main`

---

## 1. Resumo executivo

A aplicação **tem** um sistema de componentes: 56 primitivos shadcn/Radix, um
`AdminPageHeader` bem construído e adotado por 19 arquivos, e primitivos de
layout (`StatGrid`) com a regra de breakpoint encapsulada.

O problema não é ausência de sistema. É **abandono do sistema no meio do
caminho**: várias peças certas foram criadas e nunca adotadas, enquanto as telas
seguiram reimplementando o mesmo padrão à mão.

O sintoma mais claro está escrito pelo próprio código. `components/ui/empty-state.tsx`
traz este comentário:

> *"Havia 42 arquivos com sua própria versão disto, cada uma com ícone, tamanho e
> espaçamento ligeiramente diferentes."*

O componente foi criado para resolver isso e tem hoje **0 importadores**. Os
arquivos com estado vazio inline não caíram para zero — são **67**.

### Os três achados de maior impacto

| | Achado | Escala |
|---|---|---|
| **1** | **14 cópias do mapa de status de pedido**, já divergentes entre si | `confirmed` é **verde** no admin e **azul** no cliente — inconsistência visível ao usuário |
| **2** | **51 botões `size="icon"` sem um único `aria-label`** | Barreira de acessibilidade em todo o painel |
| **3** | **1.520 linhas de componentes órfãos não listados no inventário** | Inclui `withMobileCards`, que é exatamente a solução de um problema aberto na auditoria de responsividade |

**22 achados** no total, classificados nas 5 categorias pedidas.

---

## 2. Duplicação real

Mesma responsabilidade, implementações independentes, **divergência já
materializada ou inevitável**.

| ID | Componente | Arquivo | Usado por | Problema | Evidência | Impacto | Solução proposta | Dependências |
|---|---|---|---|---|---|---|---|---|
| **D-01** | Mapa de status de pedido/orçamento | 14 arquivos: `admin/AdminContent.tsx:455`, `admin/CustomerOrdersModal.tsx:72`, `admin/OrderDetailsModal.tsx:136`, `admin/QuoteModal.tsx:293`, `admin/MarketplacesContent`, `customer/CustomerDashboard.tsx:67`, `customer/CustomerOrders.tsx:76`, `customer/CustomerQuotes`, `mechanic/MechanicSettingsView.tsx:298`, `revisions/RevisionCard.tsx:51`, `store/OrderCard`, `pages/MyAccount`, `utils/orderPdf.ts:3`, `utils/orderWhatsApp.ts:22` | todas as telas de pedido | Cada tela tem seu `statusMap` com label, cor e ícone. **Já divergiram** | `AdminContent:458` → `CONFIRMED: 'bg-green-100'`; `CustomerOrders:79` → `confirmed: 'bg-blue-100'`. Também `preparing`: azul no admin, laranja no cliente. Admin usa `UPPERCASE` + fallback lowercase; cliente só lowercase | **ALTO** — o mesmo pedido muda de cor conforme quem olha; corrigir um rótulo exige achar 14 lugares | Um único `lib/orderStatus.ts` exportando `{label, color, icon}` por status, consumido pelas 14 chamadas. Resolve também a divergência UPPERCASE/lowercase | `lucide-react` (ícones); nenhuma nova |
| **D-02** | Padrão "busca + filtro de status" | 15 arquivos vivos: `AdminCouponsSection`, `AdminProductsSection`, `AdminServicesSection`, `AdminPromotionsSection`, `AdminPromotionsOverview`, `AdminContent`, `AdminSupportContent`, `PromotionsManagement`, `RevisionsListContent`, `RevisionAppointmentsContent`, `CustomerFavorites`, `CustomerOrders`, `CustomerQuotes`, `RequestQuoteModal`, `support/TicketList` | — | `<Input>` com ícone `Search` + `<Select>` de status reconstruídos em cada tela | 15 placeholders distintos para a mesma função: `"Buscar por codigo, descricao..."`, `"Buscar por nome, SKU, categoria, fornecedor..."`, `"Buscar tickets..."`. Cada um decide seu layout de linha | **ALTO** — 15 pontos de manutenção; comportamento de filtro inconsistente entre telas | Extrair `<FilterBar search={} onSearch={} filters={[]} />`. **Ver O-01**: já existe `AdvancedFilters` (772 l.) órfão que tentava isso | `ui/input`, `ui/select` |
| **D-03** | Uploader de imagem da landing | `LandingPageEditor/StyleControls/ImageUploader.tsx` (332 l.) e `ImageUploaderWithCrop.tsx` (477 l.) | `ImageUploader`: `FooterEditor`, `HeaderEditor` · `WithCrop`: `AboutEditor`, `HeroEditor` | Duas implementações da mesma coisa, com API quase idêntica | Props de `ImageUploaderWithCrop` são um **superset exato** de `ImageUploader` (`label`, `value`, `onChange`, `description`, `acceptedFormats`, `category` + crop). `diff` normalizado: 209 linhas divergentes de 477 | **MÉDIO** — editores irmãos com comportamentos diferentes sem razão de domínio | Unificar em `ImageUploader` com prop `crop?: {aspectRatio, recommendedWidth, recommendedHeight}`; sem `crop`, comportamento atual | `ProductImageCropper`, `react-image-crop` |
| **D-04** | Estado vazio ("Nenhum X encontrado") | **67 arquivos** com versão inline | — | Existe `ui/empty-state.tsx` com **0 importadores**; cada tela desenha o seu | 112 ocorrências de `Nenhum/Nenhuma` em 67 arquivos. O próprio `empty-state.tsx` documenta ter sido criado para substituir "42 arquivos" | **MÉDIO** — inconsistência visual a cada navegação; o componente correto existe e é ignorado | Adotar `EmptyState` nos 67 pontos. **Não requer criar nada** | nenhuma |
| **D-05** | Spinner de carregamento | **92 arquivos** com `animate-spin` inline (200 ocorrências) | — | Não há componente de loading; cada tela compõe `Loader2` + classes | 200 ocorrências em 92 arquivos, fora de `components/ui/` | **MÉDIO** — tamanho, cor e centralização variam por tela | Criar `<Spinner size>` e `<LoadingState>`; adotar incrementalmente | `lucide-react` |

---

## 3. Quase duplicação

Mesma família, diferenças **reais** — precisam de decisão, não de fusão cega.

| ID | Componente | Arquivo | Usado por | Problema | Evidência | Impacto | Solução proposta | Dependências |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Seções públicas duplicadas | `components/{Footer,Hero,Products,Promotions,Services}.tsx` vs `m2/components/*` | raiz: **0** · m2: `pages/Index.tsx` | Duas versões de cada seção da landing. **Não são cópias — divergiram** | `Products`: 438 l. (raiz) vs 183 l. (m2), 539 linhas divergentes. `Promotions`: 353 vs **471** — a versão m2 **cresceu**, ou seja, houve evolução paralela | **MÉDIO** — 1.320 linhas mortas, mas com risco: a versão raiz pode conter recurso não portado | Antes de remover, **diff dirigido** para confirmar que nada da raiz é exclusivo. O inventário §15.2 já as dá como órfãs — confirmei: 0 importadores | barrel `components/index.ts` (também órfão) |
| **Q-02** | `CustomerSelector` / `VehicleSelector` | `revisions/CustomerSelector.tsx` (227 l.), `revisions/VehicleSelector.tsx` (272 l.) | 1 consumidor cada (wizard de revisão) | Dois seletores com busca + lista + dialog, construídos do zero, enquanto `ui/combobox.tsx` existe com **1 único uso** | `ui/combobox` usado só por `CreateVehicleModalCustomer`. Os dois seletores reimplementam busca e seleção | **BAIXO** — funcionam; o custo é manutenção paralela | Avaliar se `Combobox` cobre o caso. Se não cobrir (carregamento assíncrono, cards ricos), **manter separados e documentar o porquê** | `ui/command`, `ui/popover` |
| **Q-03** | Modal do produto vs do serviço | `admin/ProductModal.tsx`, `admin/ServiceModal.tsx` | `AdminContent`, `AdminServicesSection` | Mesma estrutura (tabs + form + footer), APIs e tamanhos diferentes (`sm:max-w-4xl` vs `max-w-4xl` — **sem o prefixo `sm:`**) | `ServiceModal:217` usa `max-w-4xl` sem prefixo; `ProductModal:616` usa `sm:max-w-4xl`. Ambos com o mesmo `TabsList` `grid-flow-col auto-cols-max sm:auto-cols-fr` | **MÉDIO** — `max-w-4xl` sem `sm:` estreita a caixa no celular, contrariando o full-screen do `dialog.tsx` | Padronizar via `ResponsiveDialogContent size="xl"` (**ver O-02**) | `ui/dialog`, `ui/tabs` |

---

## 4. Oportunidade de reutilização

Peça compartilhável **já existe** ou seria barata — e as telas não usam.

| ID | Componente | Arquivo | Usado por | Problema | Evidência | Impacto | Solução proposta | Dependências |
|---|---|---|---|---|---|---|---|---|
| **O-01** | `AdvancedFilters` + `useAdvancedFilters` | `components/AdvancedFilters.tsx` (772 l.), `hooks/useAdvancedFilters.ts` (522 l.), `components/SmartFilters.tsx` (479 l.) | `AdvancedFilters` ← só `SmartFilters`; `SmartFilters` ← **ninguém** | 1.773 linhas construídas para resolver D-02, **nunca conectadas** | Cadeia: `SmartFilters` (0 refs) → `AdvancedFilters` → `useAdvancedFilters`. Todo o ramo morto | **ALTO** — o trabalho está feito e as 15 telas seguem à mão | Decidir: adotar em 1 tela piloto **ou** remover e extrair um `FilterBar` mínimo. Manter como está é o pior dos mundos | `ui/input`, `ui/select`, `ui/popover` |
| **O-02** | `ResponsiveDialogContent` | `ui/responsive-dialog.tsx` | **9 arquivos de aplicação** (11 contando os de `ui/`) | **31 arquivos usam `<DialogContent>` cru** e reimplementam o que o wrapper encapsula | **13 tamanhos ad-hoc distintos**: `sm:max-w-4xl` (11×), `sm:max-w-2xl` (5×), `sm:max-w-[500px]`, `sm:max-w-3xl`, `sm:max-w-5xl`, `max-w-md`, `max-w-4xl` (sem `sm:`)… Cada um recompõe `flex flex-col` + `overflow-y-auto` + `shrink-0` à mão (ex.: `OrderDetailsModal` tem 13 `shrink-0`) | **ALTO** — 31 modais com geometria própria; qualquer ajuste de padrão exige 31 edições | Migrar para `ResponsiveDialogContent size="sm|md|lg|xl|2xl"`. A escala de 7 tamanhos já cobre os 13 usos ad-hoc | `ui/dialog` |
| **O-03** | `withMobileCards` | `store/withMobileCards.tsx` (38 l.) | **0** | HOC que troca tabela por cards no mobile — **exatamente o problema P-06** da auditoria de responsividade (`/store-panel/usuarios`: tabela de 863px em container de 286px) | 0 importadores. A solução existe, documentada com exemplo de uso no próprio arquivo | **ALTO** — problema aberto com solução pronta e não usada | Aplicar em `AdminUsersSection` e `LoyaltyManagement` (as 2 telas com tabela real) | `hooks/use-mobile` |
| **O-04** | `PageContainer`, `CardGrid`, `ActionRow` | `layout/ResponsiveGrids.tsx` | **0** (só `StatGrid` tem 2) | 3 dos 4 primitivos de layout sem consumidor. Encapsulam a regra "nunca crescer em `md:`" | Confirmado por grep: 0 importadores dos três | **MÉDIO** — a regra de breakpoint volta a ser decidida tela a tela, que é o bug original do projeto | Adotar `CardGrid` nas seções de produtos/serviços/cupons/promoções e `ActionRow` nas linhas de botões | `lib/utils` |
| **O-05** | `AdminPageHeader` | `admin/AdminPageHeader.tsx` | **19 arquivos** | 4 seções ainda não usam | Sem `AdminPageHeader`: `RevisionAppointmentsContent`, `RevisionsListContent`, `ShippingMethodsManagement`, `RevisionsContent` (este é órfão) | **BAIXO** — as 3 vivas são sub-views que herdam o cabeçalho do pai; pode ser legítimo | Confirmar caso a caso. **Não forçar adoção**: sub-view com cabeçalho próprio duplicaria o título | nenhuma |
| **O-06** | Rótulo acessível em botão de ícone | 51 ocorrências de `size="icon"` | — | **Nenhum** tem `aria-label` ou `sr-only` | `grep 'size="icon"'` → 51 fora de `ui/`; dos quais **0** com rótulo acessível. Ex.: `ArrayEditor:124,134` (mover item ↑/↓), `AdminHeader:22,30` | **ALTO** — botões sem nome acessível: leitor de tela anuncia "botão" sem função. WCAG 4.1.2 | Convenção: todo `size="icon"` exige `aria-label`. Aplicável via lint | nenhuma |

---

## 5. Componente legítimo que deve permanecer separado

Parecem candidatos a fusão, mas a separação se justifica.

| ID | Componente | Arquivo | Usado por | Por que deve permanecer separado | Evidência |
|---|---|---|---|---|---|
| **L-01** | `admin/Sidebar` vs `mechanic/MechanicSidebar` | ambos | `StoreLayout` | Papéis com navegação e permissões distintas (20 itens vs 3). Fundir criaria um componente com dois modos | `adminNavigation.ts` tem seções e `requiresPermission`; `MechanicSidebar` tem lista fixa de 3. **Ressalva:** a *geometria* deveria ser compartilhada — é a causa do P-01 (CRITICAL) da auditoria de responsividade |
| **L-02** | `ProductImageUpload` vs `LandingPage/ImageUploader` | `admin/` e `StyleControls/` | ProductModal · editores | Domínios diferentes: produto = galeria múltipla com ordem e capa; landing = imagem única com `category` de servidor | APIs divergem na essência: `images: ProductImage[]` + `maxImages` vs `value: ImageConfig` + `category` |
| **L-03** | `GradientPicker` dentro de `ColorOrGradientPicker` | `StyleControls/` | `ColorOrGradientPicker:13` | Composição correta: o pai oferece cor **ou** gradiente e delega ao especialista | É o único caso da pasta em que a divisão segue composição, não cópia |
| **L-04** | `ui/dialog` (full-screen mobile) vs `ResponsiveDialog` | `ui/` | 52 arquivos | Camadas distintas: o primitivo define a geometria mobile; o wrapper, a escala desktop | `responsive-dialog.tsx:31` comenta explicitamente: *"A geometria do celular vem do DialogContent"* |
| **L-05** | `AdminPageHeader` | `admin/` | 19 | **Modelo do que funciona no projeto**: API enxuta (6 props), `min-w-0` nos dois níveis, tipografia e ações responsivas | `AdminPageHeader.tsx:21-38`. Deve servir de referência para os componentes a extrair |

---

## 6. Código possivelmente obsoleto

**Nada foi removido.** Registrado para decisão.

### 6.1 Órfãos **não listados** no inventário (achado novo desta auditoria)

O inventário §15 contabiliza 7.108 linhas. Estes **1.520** não estavam lá:

| ID | Componente | Arquivo | Linhas | Importadores | Observação |
|---|---|---|---|---|---|
| **X-01** | `ImageUpload` | `ui/ImageUpload.tsx` | 480 | **0** | Sétimo membro da família de upload |
| **X-02** | `ProductImageGallery` | `ui/ProductImageGallery.tsx` | 301 | **0** | — |
| **X-03** | `GradientColorPicker` | `StyleControls/GradientColorPicker.tsx` | 229 | **0** | Distinto de `GradientPicker`, que **é** usado |
| **X-04** | `ProductCard` | `store/ProductCard.tsx` | 162 | **0** | — |
| **X-05** | `OrderCard` | `store/OrderCard.tsx` | 140 | **0** | Contém 15ª cópia do mapa de status (D-01) |
| **X-06** | `MobileModal` | `store/MobileModal.tsx` | 131 | **0** | **Terceira** solução para modal responsivo |
| **X-07** | `withMobileCards` | `store/withMobileCards.tsx` | 38 | **0** | **Ver O-03** — não remover antes de decidir |
| **X-08** | `EmptyState` | `ui/empty-state.tsx` | 39 | **0** | **Ver D-04** — não remover, adotar |

> **X-07 e X-08 não são candidatos a remoção.** São as soluções corretas para
> problemas abertos. Removê-los seria apagar o trabalho certo e manter o errado.

### 6.2 Órfãos já registrados no inventário — reconfirmados

| Item | Linhas | Status da verificação |
|---|---|---|
| `ui/sidebar.tsx` + `admin/AdminHeader.tsx` | 803 | **Confirmado.** `AdminHeader` é o único consumidor e tem 0 importadores |
| `SmartFilters` + `AdvancedFilters` + `useAdvancedFilters` | 1.773 | **Confirmado** — mas ver O-01 antes de decidir |
| Duplicatas da raiz + barrel | 1.345 | **Confirmado** (0 importadores) — mas ver Q-01: divergiram |
| `LoginDialog.tsx.bak`, `RevisionsListContent.old.tsx` | 618 | **Confirmado.** Sem ambiguidade — versionados por engano |
| `RevisionsContent.tsx` | — | **Confirmado**, 0 importadores |

**Total de código sem referência: 7.108 (inventário) + 1.520 (novos) = 8.628 linhas.**

---

## 7. Achados transversais

### 7.1 Variantes contornadas por classe ad-hoc

`ui/button.tsx` define **10 variantes** (incluindo `hero`, `premium`, `whatsapp`)
— um sistema rico. `ui/badge.tsx` define apenas **4**.

**75 de 242 `<Badge>` (31%) passam cor por `className`** (`bg-green-100 text-green-800`,
`bg-yellow-100`, `bg-blue-100`), contornando as variantes.

| Impacto | Solução proposta |
|---|---|
| A paleta de status vive espalhada em classes literais, não em tokens. É a mesma raiz de D-01 | Adicionar variantes semânticas ao Badge (`success`, `warning`, `info`, `pending`) e ligá-las ao mapa único de D-01 |

### 7.2 Acessibilidade — estado geral

| Métrica | Valor | Leitura |
|---|---|---|
| Botões `size="icon"` | 51 | — |
| …com `aria-label` ou `sr-only` | **0** | **Falha sistemática** (O-06) |
| Arquivos com `aria-label` (fora de `ui/`) | 18 | Cobertura baixa para 193 componentes |
| Arquivos com `sr-only` | 9 | — |

Os primitivos Radix trazem acessibilidade de base (foco, `role`, teclado). O
déficit está no **código de aplicação**, onde os rótulos precisam ser escritos à mão.

### 7.3 Dependências — sem excesso identificado

Verifiquei as bibliotecas de UI do `package.json` contra o uso real: `recharts`,
`embla-carousel`, `vaul`, `cmdk`, `react-image-crop`, `browser-image-compression`,
`input-otp`, `react-resizable-panels` — todas têm consumidor.

**Ressalva:** `react-resizable-panels` e `input-otp` entram apenas via primitivos
shadcn (`resizable.tsx`, `input-otp.tsx`) cujo uso na aplicação **não verifiquei
individualmente** — ver PENDING (§9).

---

## 8. Divergências em relação ao inventário

Reverifiquei as afirmações do inventário contra o código. Duas precisam de ajuste:

| # | O que o inventário diz | O que o código mostra |
|---|---|---|
| 1 | §4.2 trata as 5 seções da raiz como "duplicação" | São **quase-duplicatas divergentes**, não cópias. `Promotions` da raiz tem 353 linhas e a do m2 tem **471** — houve evolução paralela. Remover sem diff dirigido pode perder trabalho (Q-01) |
| 2 | §15 contabiliza 7.108 linhas órfãs | Faltam **1.520 linhas** em 8 componentes (§6.1). Total real: **8.628** |

Ambas foram confirmadas por `diff` e `grep`, não por leitura.

---

## 9. Cobertura e PENDING

### 9.1 Cobertura por área do inventário

| Área do inventário | Itens | Auditados | Estado |
|---|---|---|---|
| §4.1 Landing (raiz) | 21 | 21 | **AUDITED** |
| §4.2 Variantes `m2/` | 5 | 5 | **AUDITED** (Q-01) |
| §5.1 Admin | 58 | 58 | **AUDITED** |
| §5.2 Cliente | 21 | 21 | **AUDITED** |
| §5.3 Suporte | 11 | 11 | **AUDITED** (padrões D-02, D-04) |
| §5.4 Store / shell | 8 | 8 | **AUDITED** (4 órfãos: X-04…X-07) |
| §5.5 Mecânico | 8 | 8 | **AUDITED** (L-01) |
| §5.6 Revisões | 12 | 12 | **AUDITED** (Q-02) |
| §5.7 PWA | 1 | 1 | **AUDITED** |
| §6 Biblioteca `ui/` | 56 | 56 | **AUDITED** no nível de importadores e variantes |
| §7.1 Hooks | 34 | — | **PENDING** (ver 9.2) |

### 9.2 PENDING — o que não foi verificado e por quê

| # | Item | Por que ficou pendente | O que seria preciso |
|---|---|---|---|
| **1** | **Hooks (`src/hooks/`, 34 arquivos)** | O pedido é auditoria de **componentes**. Auditei só os hooks que sustentam componentes (`use-mobile`, `useAdvancedFilters`) | Auditoria dedicada de duplicação entre `useProducts`/`useAdminProducts`, `useFavorites`/`useFavoritesCache`/`useFavoritesSync` — nomes que sugerem sobreposição |
| **2** | **Uso individual de 5 primitivos `ui/`** | Verifiquei importadores dos suspeitos, não dos 56 | `grep` por consumidor de `resizable`, `input-otp`, `menubar`, `context-menu`, `breadcrumb` |
| **3** | **Props drilling / composição profunda** | Exigiria análise de fluxo de dados, não de estrutura | Rastrear props através de `AdminContent` (2.323 l.) até os filhos |
| **4** | **Estados internos (loading/erro/disabled) por componente** | Auditei o padrão agregado (D-05), não componente a componente | Inspeção dos 193 componentes de aplicação |
| **5** | **Acessibilidade além de rótulos** | Medi `aria-label`/`sr-only`. Foco, ordem de tabulação e contraste exigem execução | Auditoria com axe-core na aplicação rodando |
| **6** | **Consistência visual medida** | Avaliei por código (variantes, tokens). Não comparei renderizações | Screenshots comparativos ou testes de regressão visual |
| **7** | **`packages/ui` (`@moria/ui`)** | Fora de `apps/frontend/src`; é o módulo de instalação PWA | Auditoria do pacote separado |

**A cobertura não é total:** 7 itens seguem `PENDING`. Os componentes de
`apps/frontend/src` estão 100% cobertos no eixo de duplicação, reuso e
importadores; o que falta são eixos mais profundos (props, estados, a11y
executada) e a camada de hooks.

---

## 10. Contagens finais

- **Componentes inventariados:** 249 `.tsx` (193 de aplicação + 56 primitivos).
- **Componentes auditados:** **249** no eixo importadores/duplicação/variantes.
- **Achados:** **22** — 5 duplicação real, 3 quase duplicação, 6 oportunidade de
  reuso, 5 legítimos separados, 8 obsoletos (X-01…X-08), mais 2 transversais
  (§7.1, §7.2). *(Os 8 órfãos contam como um bloco de achado em §6.1.)*
- **Impacto ALTO:** **5** — D-01, D-02, O-01, O-02, O-03, O-06.
- **Código sem referência:** **8.628 linhas** (7.108 já mapeadas + **1.520 novas**).
- **Itens PENDING:** **7**.

---

## 11. Gate

**Nada foi implementado, removido ou renomeado.**

Ordem sugerida para a etapa seguinte, por relação impacto/risco:

1. **D-01** (ALTO, risco baixo) — mapa único de status. Corrige inconsistência
   visível e destrava as variantes de Badge (§7.1).
2. **O-06** (ALTO, risco nulo) — `aria-label` nos 51 botões de ícone. Puramente
   aditivo.
3. **D-04 + O-03** (MÉDIO/ALTO, risco baixo) — adotar `EmptyState` e
   `withMobileCards`, que **já existem**. Resolve também o P-06 da auditoria de
   responsividade.
4. **O-02** (ALTO, risco médio) — migrar os 31 modais para `ResponsiveDialog`.
   Mexe em geometria de modal; pede re-medição.
5. **O-01 + D-02** (ALTO, **decisão antes de código**) — definir o destino das
   1.773 linhas de filtros antes de extrair `FilterBar`.
6. **Q-01 / §6** (limpeza, risco baixo **após** diff dirigido) — remoção das
   8.628 linhas órfãs, **preservando X-07 e X-08**.
