# Auditoria de Responsividade — m2-auto-hub

> **Etapa de auditoria. Nada foi implementado, corrigido ou refatorado.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §15-B (43 telas + 3 shells +
> 4 mecanismos de navegação + 7 estados de sistema).
>
> **Método:** aplicação real rodando em Docker (`localhost:8080`), medição de DOM
> com Playwright/Chromium headless, login real por API nos três papéis
> (SUPER_ADMIN, STAFF/mecânico, cliente). **585 amostras** = 39 telas × 15
> larguras. Tudo marcado **[MEDIDO]** vem dessas medições, não de leitura de
> código. Onde a causa foi confirmada no código, o arquivo e a linha estão
> citados.
>
> Data: 17/09/2026 · Base: branch `main` · Stack: containers `m2-*`

---

## 1. Larguras auditadas

As 9 faixas pedidas, mais 6 larguras intermediárias escolhidas por **não**
coincidirem com breakpoint do Tailwind — é onde bugs de layout costumam se
esconder.

| Faixa pedida | Larguras medidas |
|---|---|
| mobile pequeno | **320**, 360 |
| mobile grande | **414** |
| *intermediária (fora de breakpoint)* | **600** |
| tablet portrait | **768**, **834** |
| *intermediária* | **800**, **900** |
| tablet landscape | **1024** |
| *intermediária* | **1000**, **1112** |
| notebook pequeno | **1180** |
| notebook intermediário | **1280**, **1366** |
| desktop | **1440** |
| telas largas | **1920**, **2560** |

---

## 2. Resumo executivo

O painel **admin** foi corrigido numa rodada anterior e as medições confirmam
isso: rail de 72px entre 768 e 1399px, crescimento monotônico da área útil, zero
overflow. **Essa correção não foi propagada para os outros dois shells.**

Os dois achados mais graves são a mesma falha estrutural, em lugares diferentes:

> **P-01 — Painel do mecânico:** aos 800px a sidebar fixa de 256px entra e a área
> de conteúdo **cai de 768px para 544px (−29%)**. No mesmo pixel, a grid de KPIs
> vai para **5 colunas**. Resultado medido: **5 rótulos cortados** em células de
> 40px. É o bug original do projeto, sobrevivendo intacto em `MechanicPanel`.

> **P-02 — Dashboard do cliente:** overflow horizontal de **36px em 320px** e
> **16px em 360px**, causado por um card de KPI com padding fixo.

Os demais 9 problemas são localizados (texto cortado, alvos de toque, tabela
estreita) e não bloqueiam uso.

**11 problemas** no total: **2 CRITICAL**, **3 HIGH**, **4 MEDIUM**, **2 LOW**.

---

## 3. A evidência central — largura útil por shell [MEDIDO]

Largura do `<main>` (área de conteúdo) por viewport, nos três shells. É a métrica
que expõe o antipadrão: **a área útil tem de crescer junto com a viewport.**

```
viewport | admin  | mecânico | observação
---------|--------|----------|----------------------------------------
   768   |   768  |    768   | nenhuma sidebar ainda
   800   |   744* |    544   | ← mecânico: QUEDA de 224px (−29%)
   834   |   762  |    578   |
   900   |   828  |    644   |
  1024   |   952  |    768   |
  1112   |  1040  |    856   |
  1180   |  1108  |    924   |
  1280   |  1208  |   1024   |
  1366   |  1294  |   1110   |
  1440   |  1152  |   1184   | ← admin: queda de 142px (sidebar full)
  1920   |  1632  |   1664   |
  2560   |  2272  |   2304   |
```
\* admin em 800px interpolado entre 768 e 834; o rail de 72px já está ativo.

**Leitura:**

1. **O admin cresce de forma quase monotônica.** O único degrau é em 1440px,
   quando a sidebar expande de 72 para 288px (`sidebar-full`). Mesmo ali, os
   1152px resultantes ficam **muito acima** de qualquer ponto anterior, e
   nenhum texto é cortado — verificado.
2. **O mecânico tem uma regressão real em 800px**: 768 → 544. E só volta ao
   patamar de 768px lá em **1024px**. Ou seja, toda a faixa 800–1023px opera com
   menos espaço do que um tablet em retrato.

### Causa raiz do P-01, confirmada no código

| Peça | Arquivo | Achado |
|---|---|---|
| Sidebar | [MechanicSidebar.tsx:36](apps/frontend/src/components/mechanic/MechanicSidebar.tsx#L36) | `isCollapsed ? "w-20" : "w-64"` — **256px fixos, sem breakpoint**. Não há estágio *rail* como no admin. |
| Grid de KPIs | [MechanicRevisionsView.tsx:210](apps/frontend/src/components/mechanic/MechanicRevisionsView.tsx#L210) | `grid-cols-1 gap-4 md:grid-cols-5` — **5 colunas a partir de `md:` (768px)**, exatamente onde a sidebar rouba o espaço. |

O admin resolveu isso com o rail CSS (`styles/lojista.css`) e com `StatGrid`, que
nunca cresce em `md:` ([ResponsiveGrids.tsx:46](apps/frontend/src/components/layout/ResponsiveGrids.tsx#L46)).
**O mecânico não usa nenhum dos dois.**

---

## 4. Problemas encontrados

### CRITICAL

| ID | Item | Rota / Componente | Viewport | Evidência [MEDIDO] | Causa | Sev. | Solução proposta |
|---|---|---|---|---|---|---|---|
| **P-01** | M1, M2, M3, L3 | `/mechanic-panel/*` · `MechanicSidebar` + `MechanicRevisionsView` | **800–1023px** (pior: 800) | Área útil cai de **768px → 544px**; grid vai a **5 col × 90px**; **5 rótulos cortados** (`"Fila de hoje e proximos horarios"` em célula de 40px, `scrollWidth 52 > clientWidth 40`) | Sidebar `w-64` (256px) fixa, sem estágio rail + grid `md:grid-cols-5` aumenta colunas no mesmo pixel em que o container encolhe | CRITICAL | Aplicar ao mecânico o padrão já existente no admin: rail de 72px na faixa 768–1399px e trocar `md:grid-cols-5` por `StatGrid` (ou `grid-cols-2 nb:grid-cols-5`) |
| **P-02** | C1 | `/customer/inicio` · `CustomerDashboard` | **320px** e **360px** | Scroll horizontal da página: `scrollWidth 356 > clientWidth 320` (**+36px**); em 360px **+16px**. Reproduzido **3/3**. Culpado isolado removendo o nó: card **"Total Gasto — R$ 4.500,00"** | [CustomerDashboard.tsx:156-159](apps/frontend/src/components/customer/CustomerDashboard.tsx#L156-L159): `CardContent p-6` (48px) + ícone `h-8 w-8` (32px) + `ml-4` (16px) + valor sem `min-w-0`, em célula de **136px** (`grid-cols-2`) | CRITICAL | `p-6` → `p-4 sm:p-6`; adicionar `min-w-0` ao `div.ml-4` e `truncate` ao valor. A grid em si (`grid-cols-2 nb:grid-cols-4`) já está correta |

> **Por que CRITICAL:** P-01 degrada a ferramenta de trabalho do mecânico em toda
> a faixa de tablet/notebook pequeno, com texto ilegível. P-02 é scroll
> horizontal na página inicial do cliente no aparelho mais comum de entrada
> (320–360px) — o sintoma clássico de layout quebrado.

### HIGH

| ID | Item | Rota / Componente | Viewport | Evidência [MEDIDO] | Causa | Sev. | Solução proposta |
|---|---|---|---|---|---|---|---|
| **P-03** | P1, N4 | `/` · `Contact` (landing) | **320px** | Scroll horizontal `scrollWidth 348 > 320` (**+28px**). Culpado: `div.bg-secondary.rounded-xl.p-8` com **332px** de largura dentro de `container px-4` | [Contact.tsx:70](apps/frontend/src/components/Contact.tsx#L70): `p-8` = 64px de padding horizontal fixo, sem variante mobile | HIGH | `p-8` → `p-5 sm:p-8` |
| **P-04** | P1, N4 | `/` · `m2/Footer` | **320–834px** (todas) | **6 links** de navegação com **20px de altura** (`35×20`, `39×20`, `58×20`, `59×20`, `75×20`, `52×20`). WCAG 2.2 §2.5.8 exige **24×24px** | [m2/components/Footer.tsx:80](apps/frontend/src/m2/components/Footer.tsx#L80): `text-sm` sem `py` nem `min-h` | HIGH | Adicionar `inline-flex items-center min-h-[24px] py-1` aos links do rodapé |
| **P-05** | L2, N3 | `/customer/*` · `MobileDrawer` | **320–414px** | Drawer **fechado** fica em `left:320 right:592` — **272px fora da viewport**, em posição `fixed` | [MobileDrawer.tsx:87-88](apps/frontend/src/components/customer/MobileDrawer.tsx#L87-L88) usa `fixed ... translate-x-full`; o equivalente do admin usa `absolute` dentro de container com overflow contido ([StoreMobileDrawer.tsx:79](apps/frontend/src/components/store/StoreMobileDrawer.tsx#L79)) | HIGH | Alinhar ao padrão do admin: `absolute` em wrapper com `overflow-x: hidden`, ou adicionar `overflow-x: clip` ao contêiner do shell do cliente |

> **Nota de honestidade sobre P-05:** este drawer **não** é a causa do scroll de
> P-02 — isolei removendo o nó e o `scrollWidth` permaneceu 356. Ele é um risco
> latente (272px fora da tela num elemento `fixed`), não o culpado atual. A
> severidade HIGH reflete a fragilidade estrutural, não um sintoma visível hoje.

### MEDIUM

| ID | Item | Rota / Componente | Viewport | Evidência [MEDIDO] | Causa | Sev. | Solução proposta |
|---|---|---|---|---|---|---|---|
| **P-06** | A20 | `/store-panel/usuarios` · `AdminUsersSection` | **320–900px** | Tabela com **863px** dentro de container de **286px** em 320px — exige rolar **3× a largura** da tela para ver a coluna "Ações". O scroll **está contido** (`.relative.w-full.overflow-auto`), então não vaza para a página | Tabela HTML sem estratégia mobile (o projeto tem `withMobileCards.tsx`, mas ele está **órfão** — 0 importadores, ver inventário §15.7) | MEDIUM | Adotar cards em mobile (`withMobileCards` já existe) ou reduzir para colunas essenciais abaixo de `sm` |
| **P-07** | M1 | `/mechanic-panel/revisoes` | **834px**, **900px** | **5 textos cortados** em 834px, **2** em 900px. Ex.: `"Aguardando inicio"` com `clientWidth 59 < scrollWidth 70` | Consequência direta de P-01 (grid de 5 colunas em container estreito) | MEDIUM | Resolvido junto com P-01 |
| **P-08** | A14 | `/store-panel/promocoes` | **320px** | **3 rótulos de KPI cortados**: `"Programadas"` (`cw 77 < sw 97`), `"Usos acumulados"` (`cw 77 < sw 90`), `"Promoções"` (`cw 77 < sw 81`) | Rótulo `text-xs uppercase tracking-wide` em célula de 77px (`grid-cols-2` em 320px). O `tracking-wide` agrava | MEDIUM | Remover `tracking-wide` abaixo de `sm`, ou encurtar rótulos ("Usos" em vez de "Usos acumulados") |
| **P-09** | A19 | `/store-panel/configuracoes` | **320–414px** | Texto cortado: `"contato@m2centerauto.com.br • Wh..."` com `clientWidth 146 < scrollWidth 236` em 320px | String longa composta (e-mail + WhatsApp) em linha única sem quebra | MEDIUM | Permitir quebra (`break-words`) ou separar em duas linhas abaixo de `sm` |

### LOW

| ID | Item | Rota / Componente | Viewport | Evidência [MEDIDO] | Causa | Sev. | Solução proposta |
|---|---|---|---|---|---|---|---|
| **P-10** | L1, L3, N1 | `Sidebar` (admin) e `MechanicSidebar` | admin **1440+**; mecânico **768+** | Link **"Voltar ao Site"** com **20px de altura** (256×20 / 224×20) — abaixo dos 24px da WCAG 2.5.8 | [Sidebar.tsx:151](apps/frontend/src/components/admin/Sidebar.tsx#L151) e [MechanicSidebar.tsx:121](apps/frontend/src/components/mechanic/MechanicSidebar.tsx#L121): `<span>` sem `min-h` | LOW | `min-h-[24px]` + `py-1`. LOW porque é ponteiro/desktop, onde 2.5.8 é menos crítico |
| **P-11** | C2, C5, A10 | `/customer/perfil`, `/customer/veiculos`, `/store-panel/relacionamento` | **320–768px** | 1 texto cortado por tela: `"Dados Pessoais"` (`93<100`), `"Cadastrar Veiculo"` (`120<131`), `"WhatsApp"` em botão (`75<88`) | Rótulos de botão/aba com `whitespace-nowrap` em container estreito. Corte de **4 a 13px** — o texto continua legível | LOW | Encurtar rótulo em mobile ou permitir quebra. Impacto cosmético |

---

## 5. Verificações que **passaram** (e não viraram problema)

Registrado para que a próxima etapa não re-investigue o que já foi medido.

| Verificação | Resultado [MEDIDO] |
|---|---|
| **Overflow horizontal** nas 43 telas × 15 larguras | **3 ocorrências apenas** (P-01 não gera overflow; P-02 e P-03 geram). 582 de 585 amostras limpas |
| **Rodapé de ação de modal inalcançável** | **Não se confirmou.** `ProductModal` em 360×800: modal full-screen, **0 botões fora da viewport**, "Cancelar" em `bottom: 791` (dentro dos 800px) |
| **7 abas do `ProductModal` em mobile** | Somam 524px em container de 286px, **mas o wrapper `overflow-x-auto` rola de fato** (`canScroll: true`, `clientWidth 318 / scrollWidth 524`). Após `scrollIntoView`, a última aba fica visível. **Não é bloqueio** — ver §7 |
| **Grids do admin aumentando colunas em `md:`** | **Nenhuma.** `AdminProductsSection` e `StatGrid` saltam de 2 para 4 colunas só em 1024/1180px |
| **Área útil do admin** | Cresce monotonicamente 768→1294px; único degrau em 1440px (1294→1152), **sem corte de texto** |
| **Tabela A20 vazando para a página** | Não vaza: scroll contido em `.overflow-auto`. O problema é de usabilidade (P-06), não de layout quebrado |
| **Telas públicas P2, P3, P4** | Zero overflow, zero clip, zero alvo pequeno em todas as 15 larguras |
| **Larguras intermediárias (600, 800, 900, 1000, 1112)** | Só 800/900 acusaram problema, ambos do mecânico (P-01/P-07) |
| **Telas largas (1920, 2560)** | Zero overflow e zero clip em todas as telas |

---

## 6. Achado transversal: o fork de DOM por JavaScript

`useIsMobile()` ([use-mobile.tsx](apps/frontend/src/hooks/use-mobile.tsx)) inicia
como `undefined` e **retorna `false` no primeiro render**, só corrigindo depois
do `useEffect`. Em um celular, o primeiro render monta a **árvore de desktop** e
em seguida a substitui.

Os três shells dependem disso (`StoreLayout:45`, `CustomerLayout:48`,
`MechanicPanel` via `StoreLayout`), o que significa **duas árvores de DOM
distintas** para a mesma tela, trocadas em runtime.

**Não registrei isso como problema numerado** porque não consegui medir impacto
visível: as medições esperam `networkidle` + 1,1s, quando a troca já ocorreu.
Confirmar exigiria instrumentar o primeiro paint. Fica como **item explícito
para a próxima etapa**, não como achado fechado.

---

## 7. Correção de um diagnóstico anterior

`RESPONSIVE-UX-AUDIT.md` §4 lista **A5**: *"`ProductModal`: 7 abas com
`sm:w-full sm:auto-cols-fr` anulam o próprio `overflow-x-auto`"*.

**A medição não confirma.** Em 320/360/414/600px o wrapper
([ProductModal.tsx:615](apps/frontend/src/components/admin/ProductModal.tsx#L615))
tem `overflowX: auto` com `scrollWidth 524 > clientWidth 318` e **rola**. A
última aba ("Marketplaces") é alcançável.

O que **é** verdade: em **768px e 834px** o `sm:auto-cols-fr` força 7 colunas
iguais de 91px e a aba "Marketplaces" fica cortada em 4px (`cw 91 < sw 95`).
Isso é cosmético — registrado como parte de P-11, não como item próprio.

---

## 8. Cobertura por item do inventário

### 8.1 Telas auditadas

| Grupo | IDs | Auditados | Problemas |
|---|---|---|---|
| Públicas | P1–P5, P7 | **6/6** | P-03, P-04 (P1) |
| Cliente | C1–C9, P9 | **10/10** | P-02 (C1), P-11 (C2, C5) |
| Admin | A1–A20 | **20/20** | P-06 (A20), P-08 (A14), P-09 (A19), P-11 (A10), P-10 (todas) |
| Mecânico | M1–M3 | **3/3** | P-01, P-07, P-10 |
| **Total** | | **39/39 telas navegáveis** | |

### 8.2 Shells, navegação e estados

| ID | Item | Estado | Observação |
|---|---|---|---|
| L1 | `StoreLayout` (admin) | **AUDITED** | Rail 72px confirmado; sem regressão |
| L2 | `CustomerLayout` | **AUDITED** | Grid `md:`/`nb:` confirmada; P-05 |
| L3 | `MechanicPanel` | **AUDITED** | **P-01 (CRITICAL)** |
| N1 | Sidebar / rail admin | **AUDITED** | P-10 |
| N2 | Bottom nav + drawer admin | **AUDITED** | `min-h-[44px]` presente; sem problema |
| N3 | Bottom nav + drawer cliente | **AUDITED** | `h-16` com `grid-cols-5` para 5 itens; P-05 |
| N4 | Navbar landing | **AUDITED** | P-03, P-04 |
| S1 | `ErrorBoundary` | **PENDING** | Exige provocar erro de render — não feito |
| S2 | 404 | **AUDITED** | 1 link de 20px (mesma classe de P-04) |
| S3 | Loading de auth | **PENDING** | Estado transitório; não capturado |
| S4 | Skeletons | **PENDING** | 1 consumidor; exige rede lenta simulada |
| S5 | Empty state | **AUDITED (órfão)** | 0 consumidores — nada a medir |
| S6 | Toasts | **PENDING** | Exige disparar ação que gere toast |
| S7 | Guards de rota | **NOT APPLICABLE** | Sem UI própria |

---

## 9. Contagens finais

- **Itens inventariados:** **57** = 43 telas (§15-B.1–4, incluindo 3 órfãs sem
  rota) + 3 shells + 4 navegações + 7 estados de sistema.
- **Itens auditados:** **48** = 39 telas navegáveis + 3 shells + 4 navegações +
  2 estados (S2, S5).
- **Itens PENDING:** **5** — S1 (ErrorBoundary), S3 (loading de auth), S4
  (skeletons), S6 (toasts), e **A2 com lista vazia** (ver §10).
- **Itens NOT APPLICABLE:** **4** — P12, P13, P14 (páginas órfãs, sem rota) e S7
  (guard sem UI).
- **Problemas encontrados:** **11**.
- **Problemas críticos/altos:** **5** — 2 CRITICAL (P-01, P-02) + 3 HIGH (P-03,
  P-04, P-05).
- **Amostras de medição:** **585** (39 telas × 15 larguras), mais corridas
  dirigidas de modais, tabs, tabela e overflow.

**A cobertura não é 100%:** 5 itens seguem `PENDING`. As telas navegáveis estão
100% medidas; o que falta são estados transitórios de sistema.

---

## 10. Áreas que não puderam ser verificadas, e por quê

| Área | Motivo | O que seria preciso |
|---|---|---|
| **S1 — `ErrorBoundary`** | Não há rota que force erro de render. Provocar um exigiria alterar código, o que esta etapa proíbe | Injetar um componente que lance exceção, em branch separada |
| **S3 — Loading de auth** | Estado transitório: as medições esperam `networkidle`, quando o spinner já saiu | Throttling de rede no CDP e captura no primeiro paint |
| **S4 — Skeletons** | Mesmo motivo; único consumidor é `CustomerFavorites` | Throttling + medição durante o carregamento |
| **S6 — Toasts** | Exige disparar ação que gere toast (salvar/apagar). Seria escrita de dados no banco | Ambiente descartável, ou mock da camada de API |
| **A2 — `/store-panel/pedidos`** | Carregou com **"Nenhum pedido encontrado"** (medido). Layout auditado; **a lista populada não** | Seed com pedidos, ou fixture de API |
| **Fork de DOM (`useIsMobile`)** | Ver §6 — a troca ocorre antes da medição | Instrumentar o primeiro render |
| **Fluxos ponta a ponta (FL1–FL14)** | Auditei as **telas** de cada fluxo, não as transições entre elas. Percorrer os fluxos escreveria dados | Ambiente descartável |
| **Modais além dos 4 medidos** | Medi `ProductModal`, `CreateOrderModal`, `CreateUserModal` e tentei `CreateQuoteModal` (botão não localizado pelo seletor). Restam ~43 arquivos de modal | Mapear o gatilho de cada modal individualmente |
| **App Flutter (`apps/mobile`)** | Fora do escopo web, como no inventário | Emulador Android/iOS |
| **Zoom de texto / `prefers-reduced-motion`** | Não solicitado nesta etapa | — |

---

## 11. Notas de ambiente (não são achados de UI)

Registrado porque afetou a medição e pode afetar quem for reproduzir:

1. **Gateway apontava para a porta errada.** `infra/nginx/conf.d/default.conf:2`
   tinha `server frontend:3000`, mas a imagem do frontend serve na **80** —
   resultado: **502** em todo o site. Alterei localmente para conseguir medir; o
   arquivo original está em backup no scratchpad. **Não é um achado de
   responsividade**, mas é um bug real de configuração que impede o stack local
   de subir.
2. **Rate limit de login:** 5 tentativas por 15 min por IP+e-mail
   (`rate-limit.middleware.ts:10`). Duas corridas iniciais foram invalidadas por
   `429` e refeitas com sessão persistida (`storageState`).
3. **Senhas locais** são as do seed (`Test123!`), não as de
   `CREDENCIAIS-ACESSO.md`, que valem para a VPS.

---

## 12. Gate

**Nada foi implementado.** Este documento é a auditoria.

Ordem sugerida para a etapa de correção, por severidade e risco:

1. **P-02** (CRITICAL, baixo risco) — padding e `min-w-0` num card.
2. **P-03** (HIGH, baixo risco) — um `p-8` → `p-5 sm:p-8`.
3. **P-04 / P-10** (HIGH / LOW, baixo risco) — altura mínima dos links.
4. **P-08 / P-09 / P-11** (MEDIUM / LOW, baixo risco) — rótulos e quebra.
5. **P-01 + P-07** (CRITICAL, **risco alto**) — rail e grid do mecânico; é
   mudança estrutural de shell e pede re-medição da faixa 768–1024px.
6. **P-05** (HIGH, risco médio) — trocar `fixed` por `absolute` no drawer do
   cliente exige revalidar o comportamento de abertura.
7. **P-06** (MEDIUM, risco médio) — estratégia mobile para a tabela de usuários.
