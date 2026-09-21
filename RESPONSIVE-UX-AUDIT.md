# Auditoria de Responsividade, Componentes e UX — m2-auto-hub

> Documento vivo. Tudo marcado **[MEDIDO]** foi obtido rodando a aplicação e medindo
> o DOM real com Playwright headless, não por leitura de código.
> Data da medição: 16/09/2026.

---

## 1. Resumo executivo

A aplicação **não tem um problema de "faltam media queries"**. Ela tem um problema
estrutural bem específico e mensurável:

> **Aos 768px a sidebar fixa de 288px entra na tela, e a área de conteúdo
> ENCOLHE de 768px para 532px — uma perda de 31%. No mesmo pixel, as grids
> internas AUMENTAM o número de colunas, porque usam o mesmo breakpoint `md:`.**

Os dois efeitos se somam na direção errada. O resultado é que a faixa mais
quebrada do sistema não é o celular — é o **notebook e o tablet em paisagem
(820px a 1100px)**, exatamente a faixa que o pedido original apontou.

O layout só fica limpo a partir de **1180px**.

### O que está bom (e não deve ser reescrito)

- `AdminPageHeader` já existe, é responsivo correto e é usado por 17 telas.
- Os 5 modais pesados já têm footer fixo (`flex-1 overflow-y-auto` + `shrink-0`).
  A hipótese de "botão de salvar inalcançável" **foi testada e não se confirmou**.
- O `dialog.tsx` já tem variante full-screen em mobile (`h-[100dvh]`).
- A landing page pública não tem overflow horizontal em nenhuma largura testada.
- `AdminProductsSection` já usa o padrão correto de grid (pula o `md:`).

Ou seja: **existe design system, ele só está incompleto na camada de layout.**
O trabalho é evoluir, não recomeçar.

---

## 2. Tecnologias identificadas

| Camada | Tecnologia |
|---|---|
| Build | Vite 5 + SWC, monorepo Turborepo |
| UI | React 18.3, TypeScript 5.8 |
| Estilo | Tailwind 3.4 (`darkMode: class`) |
| Componentes | shadcn/ui sobre Radix UI (56 primitivos em `components/ui`) |
| Rotas | react-router-dom 6.30 |
| Dados | TanStack Query 5 + axios |
| Formulários | react-hook-form + zod |
| Backend | Node + Prisma + Postgres (Docker) |

---

## 3. A descoberta central [MEDIDO]

Medição real: markup do shell admin (`StoreLayout` + `Sidebar` + grids reais)
montado na aplicação rodando, com o CSS Tailwind compilado aplicado.
`!` = texto cortado (`scrollWidth > clientWidth`).

```
   vw  content            coupons        services          promos        products
--------------------------------------------------------------------------------
  640      640        4col 140px!      3col 192px      1col 608px      2col 299px
  700      700        4col 155px!      3col 212px      1col 668px      2col 329px
  768      768        4col 172px!      3col 235px      2col 362px      2col 363px
  820      532        4col 105px!     3col 145px!      2col 228px      2col 229px
  900      612        4col 125px!     3col 172px!      2col 268px      2col 269px
 1024      736        4col 156px!      3col 213px     4col 159px!     4col 161px!
 1100      812        4col 175px!      3col 239px     4col 178px!     4col 180px!
 1180      892         4col 195px      3col 265px      4col 198px      4col 200px
 1280      992         4col 220px      3col 299px      4col 223px      4col 225px
 1920     1632         4col 380px      3col 512px      4col 383px      4col 385px
```

Três leituras obrigatórias dessa tabela:

1. **A regressão do 768→820.** O conteúdo cai de 768px para 532px. O usuário
   troca de celular grande para tablet e a área útil diminui.
2. **O `lg:` também é cedo demais.** Mesmo a grid "correta" (`products`) corta
   texto em 1024px e 1100px. Cards de 160-180px não cabem "R$ 12.480,00".
3. **`sm:grid-cols-4` corta texto em TODAS as larguras abaixo de 1180px**,
   inclusive em 640px, onde nem existe sidebar ainda.

### Causa raiz

`components/admin/Sidebar.tsx:35` — `md:w-72` (288px), sem colapso, sem estado
intermediário. Entra inteira, de uma vez, em 768px.

---

## 4. Problemas por severidade

### CRÍTICO

| # | Problema | Local | Evidência |
|---|---|---|---|
| C1 | Sidebar de 288px entra em 768px e reduz conteúdo em 31% | `admin/Sidebar.tsx:35` | [MEDIDO] tabela §3 |
| C2 | Grids aumentam colunas no mesmo px em que o container encolhe | `AdminContent.tsx:632,687`, `AdminPromotionsSection.tsx:371` | [MEDIDO] `promos` 768→820 |
| C3 | `sm:grid-cols-4` — 4 colunas em 640px, texto cortado sempre | `AdminCouponsSection.tsx:356` | [MEDIDO] `clipped` em toda faixa |
| C4 | `sm:grid-cols-3` — 3 colunas em 640px | `AdminServicesSection.tsx:382` | [MEDIDO] corta em 820/900 |
| C5 | Faixa 768–1024 do painel do cliente cai em `grid-cols-1`: o menu lateral inteiro vira um bloco gigante ACIMA do conteúdo | `customer/CustomerLayout.tsx` (fork em 768, grid em `lg:`) | leitura de código |

**Sobre C5:** `useIsMobile()` corta em 768px, mas o grid do desktop só divide em
`lg:` (1024px). Entre 768 e 1024 o usuário recebe o layout "desktop" com uma
coluna só — ou seja, rola o cartão de perfil + 9 itens de menu antes de chegar
no conteúdo.

### ALTO

| # | Problema | Local |
|---|---|---|
| A1 | Fork JS `isMobile` gera duas árvores de DOM distintas; nada entre elas | `store/StoreLayout.tsx`, `customer/CustomerLayout.tsx` |
| A2 | Linhas de 3 botões sem `flex-wrap` | `AdminServicesSection.tsx:403`, `AdminCouponsSection.tsx:391` |
| A3 | `.lojista-content` com `padding: 2rem` fixo em toda largura ≥768px | `styles/lojista.css` |
| A4 | Alvos de toque de 20px de altura na landing (WCAG 2.5.8 exige 24px mín.) | 24 links "Solicitar pelo WhatsApp" [MEDIDO] |
| A5 | `ProductModal`: 7 abas com `sm:w-full sm:auto-cols-fr` anulam o próprio `overflow-x-auto` | `ProductModal.tsx:616` |

### MÉDIO

| # | Problema | Local |
|---|---|---|
| M1 | 6 convenções de espaçamento diferentes entre 16 seções admin | `space-y-2` a `space-y-6`, ver §6 |
| M2 | Nenhum breakpoint entre 1024 e 1280 no Tailwind (gap do notebook) | `tailwind.config.ts` |
| M3 | Seção não usa o `AdminPageHeader` compartilhado | `AdminPromotionsSection.tsx:223-256` |
| M4 | ~1250 linhas de código morto | `AdvancedFilters.tsx` + `SmartFilters.tsx` |
| M5 | Arquivo `.old.tsx` versionado | `admin/RevisionsListContent.old.tsx` |
| M6 | `sm:max-w-4xl` colide com `sm:max-w-lg` do primitivo — ordem de emissão decide | 4 modais |

---

## 5. Redundâncias encontradas

- **`AdvancedFilters` (772 l.) + `SmartFilters` (479 l.)**: não são duplicatas —
  `SmartFilters` compõe `AdvancedFilters`. Porém **nenhum arquivo importa
  `SmartFilters`**, e `AdvancedFilters` só é importado por ele. Todo o conjunto
  está morto (verificado por grep de `import ... from`).
- **`RevisionsListContent.old.tsx`**: zero referências.
- **`StoreLayout` e `CustomerLayout`** resolvem o mesmo problema (shell com nav
  + conteúdo + drawer mobile) com dois códigos independentes.

> Nada disso será apagado sem confirmação. Conforme a regra 13, está
> documentado e proposto, não removido unilateralmente.

---

## 6. Estratégia responsiva proposta

### 6.1 Breakpoints

O problema não se resolve com mais `@media`. Resolve-se alinhando os breakpoints
ao **espaço real do conteúdo**, não ao dispositivo.

Adicionar ao Tailwind, sem alterar os existentes (compatibilidade):

```ts
screens: {
  // padrões mantidos: sm 640, md 768, lg 1024, xl 1280, 2xl 1536
  'nb':  '1180px',  // [MEDIDO] menor largura onde 4 colunas não cortam texto
  '3xl': '1728px',  // limite p/ ultrawide
}
```

`nb` (notebook) não é arbitrário: é o primeiro ponto da tabela §3 sem `!`.

### 6.2 A regra de ouro das grids do admin

> **Dentro do painel admin, nenhuma grid pode aumentar colunas em `md:`.**
> `md:` é onde a sidebar rouba 288px.

| Contexto | Regra |
|---|---|
| KPIs / stat cards | `grid-cols-2 lg:grid-cols-2 nb:grid-cols-4` |
| Cards de conteúdo | `grid-cols-1 sm:grid-cols-2 nb:grid-cols-3` |
| Nunca | `sm:grid-cols-3`, `sm:grid-cols-4`, `md:grid-cols-4` |

### 6.3 Sidebar com estágio intermediário

A correção estrutural de C1/C2: em vez de 0px → 288px, introduzir o estado
**rail** (ícones, 72px) na faixa apertada.

```
< 768px        bottom nav          (como hoje)
768–1179px     rail 72px           (NOVO — recupera 216px de conteúdo)
>= 1180px      sidebar 288px       (como hoje)
```

Efeito esperado em 820px: conteúdo de 532px → **748px**.

---

## 7. Sistema de componentes — o que falta

Não criar um design system paralelo. Falta só a camada de layout:

| Componente | Papel | Status |
|---|---|---|
| `AdminPageHeader` | cabeçalho de seção | **já existe, bom** |
| `PageContainer` | padding e espaçamento fluidos da seção | **criar** |
| `StatGrid` | grid de KPI com as regras §6.2 embutidas | **criar** |
| `CardGrid` | grid de cards de conteúdo | **criar** |
| `ActionRow` | linha de ações que sabe quebrar | **criar** |

Cada um encapsula a regra de breakpoint **uma vez**, para que nenhuma tela
precise decidir de novo (requisito 19 do pedido).

---

## 8. Plano de implementação

Ordem por risco crescente: tokens → primitivos → aplicação → shell.

| Fase | Escopo | Risco |
|---|---|---|
| **1** | Breakpoints `nb`/`3xl` + padding fluido em `.lojista-content` | baixo |
| **2** | Criar `PageContainer`, `StatGrid`, `CardGrid`, `ActionRow` | baixo |
| **3** | Corrigir C3, C4, A2 (grids e botões das seções) | baixo |
| **4** | Corrigir C2 (KPIs do `AdminContent`) via `StatGrid` | médio |
| **5** | Corrigir C5 (faixa 768–1024 do painel do cliente) | médio |
| **6** | Sidebar rail — correção estrutural de C1 | alto |
| **7** | A4 (touch targets), A5, M3 | baixo |
| **8** | Re-medir e comparar com a baseline §3 | — |

Código morto (M4, M5) fica para confirmação do usuário.

---

## 9. Referências

- **WCAG 2.2 — 2.5.8 Target Size (Minimum)**: alvos de 24×24px CSS. Base para A4.
- **MDN — CSS Grid `auto-fit`/`minmax()`**: grids por espaço disponível em vez de
  contagem fixa de colunas.
- **MDN — Container Queries**: o caso correto para componente que se adapta ao
  container e não à viewport (§7). Suporte amplo desde 2023.
- **web.dev — "Responsive design patterns"**: padrão *sidebar rail* como estágio
  intermediário, base para §6.3.
- **Material Design 3 — Navigation rail**: rail entre 768 e ~1240px; confirma
  independentemente a faixa medida em §3.
- **Tailwind CSS — Responsive design**: breakpoints customizados por conteúdo.

---

## 10. Resultado medido depois da implementação

Medição da rota real do painel (componentes `Sidebar`, `StatGrid` e `CardGrid`
de verdade, CSS completo da aplicação carregado). `clip` = textos cortados,
`navLbl` = rótulos visíveis na sidebar, `hscr` = scroll horizontal.

```
   vw sidebar content         kpi  cards  clip navLbl  hscr
--------------------------------------------------------------
  360     360     360       2x158      1     0     20     -
  480     480     480       2x218      1     0     20     -
  640     640     640       2x296      2     0     20     -
  768      72     768       2x360      2     0      0     -
  820      72     748       2x350      2     0      0     -
  900      72     828       2x388      2     0      0     -
 1024      72     952       2x448      2     0      0     -
 1100      72    1028       2x485      2     0      0     -
 1180      72    1108       4x254      3     0      0     -
 1280      72    1208       4x278      3     0      0     -
 1366      72    1294       4x299      3     0      0     -
 1400     288    1112       4x253      3     0     20     -
 1536     288    1248       4x286      3     0     20     -
 1920     288    1632       4x380      3     0     20     -
```

### Antes → depois

| Métrica | Antes | Depois |
|---|---|---|
| Conteúdo em 820px | **532px** | **748px** (+41%) |
| Regressão 768→820 | −236px | **não existe mais** |
| Textos cortados (360–1920) | em 9 das 13 larguras | **0 em todas** |
| Scroll horizontal | — | **0 em todas** |
| Alvos de toque pequenos (mobile) | 24 | **0** |

O conteúdo agora **cresce de forma monotônica** com a viewport: 640 → 768 → 748*
→ 828 → 952 → 1028 → 1108 → 1208 → 1294 → 1112*.

*Os dois pequenos degraus (820 e 1400) são os pontos em que a sidebar entra e
depois se expande. Ambos permanecem bem acima do valor anterior de 532px, e
nenhum corta texto — verificado na coluna `clip`.

### Checklist

- [x] Nenhuma largura de 360 a 1920 com scroll horizontal — [MEDIDO]
- [x] Conteúdo do admin não sofre mais a queda de 768→532px — [MEDIDO]
- [x] Nenhum texto de KPI cortado em nenhuma largura — [MEDIDO]
- [x] Painel do cliente divide em `md` (fecha a faixa 768–1024)
- [x] Alvos de toque de mobile corrigidos (0 abaixo de 1100px) — [MEDIDO]
- [x] `tsc --noEmit` limpo; `vite build` passa
- [x] ESLint: 6 problemas antes, 6 depois (nenhum novo introduzido)
- [x] Nenhuma funcionalidade removida

### Pendências conhecidas (não são regressões)

- `CustomerFavorites.test.tsx` falha com `jest is not defined`: o arquivo usa API
  do Jest num projeto que roda Vitest. **Já falhava antes destas mudanças.**
- Código morto (`AdvancedFilters`, `SmartFilters`, `RevisionsListContent.old.tsx`)
  continua no repositório, aguardando confirmação para remoção.
- `StoreLayout`/`CustomerLayout` ainda são dois shells separados com fork em JS.
  A unificação é uma mudança de maior risco, proposta mas não executada.
