# Auditoria de Acessibilidade — m2-auto-hub

> **Etapa de auditoria. Nada foi implementado, corrigido ou refatorado.**
>
> Escopo: as telas do `docs/UI-UX-INVENTORY.md`, avaliadas **no navegador com a
> aplicação rodando**, não apenas por leitura de código.
>
> Método: `axe-core` 4.13 (regras `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
> `wcag22aa`, `best-practice`) injetado em 14 rotas reais via Playwright, com
> sessões autenticadas de admin e de cliente, mais roteiros próprios para o que
> o axe não cobre: ordem de tabulação, foco visível medido em `getComputedStyle`,
> trap de foco e Escape em modal, reflow a 320 px, zoom de texto a 200 %,
> tamanho de alvo de toque a 390 px, e submissão de formulário vazio para
> observar como o erro é anunciado.
>
> Critérios citados: WCAG 2.2 (níveis A e AA). Onde o achado não mapeia para um
> critério normativo, está marcado como **boa prática** e não como falha WCAG.
>
> Cobertura: 14 rotas medidas de 4 faixas (pública, admin, cliente, 404). As
> rotas não medidas estão listadas em §6 — a ausência de achado nelas **não é**
> evidência de conformidade.
>
> Data: 17/09/2026 · Base: branch `main` · Artefatos: `.a11y/*.json`

---

## 1. Resumo

A aplicação acerta o que costuma ser mais caro de consertar depois e erra o que
é barato. O que está certo é estrutural: **o foco visível funciona em 12/12 dos
elementos tabulados** (nenhum `outline: none` órfão), o **trap de foco no modal
é correto** (0 fugas em 25 tabulações, Escape fecha), o **reflow passa a 320 px
e a 200 % de zoom sem scroll horizontal**, **nenhum alvo de toque fica abaixo de
24 px** a 390 px, não há `div` com `onClick` fazendo papel de botão, e os status
carregam rótulo textual e ícone — **não dependem apenas de cor**.

O que está errado é quase todo da mesma família: **nome acessível ausente**.
São **68 botões de ícone** e **62 `SelectTrigger`** no código, e **nenhum dos dois
grupos tem um único `aria-label`** — 0 de 130. Para quem usa leitor de tela, a
tela de usuários anuncia 16 controles como "botão", sem dizer o que fazem.

Os dois achados de maior impacto real, porém, são outros. Primeiro: **o erro de
formulário não é anunciado**. Ao submeter o modal de produto vazio, o texto
"Erro de validação" aparece na tela, mas com **`aria-invalid` = 0,
`aria-describedby` = 0 e `role="alert"` = 0** — o leitor de tela não recebe o
erro, não sabe qual campo falhou, e o foco permanece no botão de submit.
Segundo: **não existe skip link e o painel não tem `<h1>`** — são **22
tabulações** para sair da navegação e alcançar o `<main>`, repetidas a cada
troca de tela.

**Contagem por severidade** (instâncias medidas, não regras):

| Severidade | Instâncias | Principal ofensor |
|---|---|---|
| Crítico | 38 | `button-name` (36), `select-name` (2) |
| Grave | 55 | `color-contrast` (53), `link-name` (2), `aria-progressbar-name` (1) |
| Moderado | 214 | `region` (204), `page-has-heading-one` (7), `heading-order` (6) |

O volume de `region` (204) é em larga medida consequência de um único defeito
estrutural — a falta de `<main>` no layout do cliente e nas páginas públicas —
e não de 204 problemas independentes. Corrigir A-02 derruba a maior parte.

> **Confirmado em 20/09/2026 (MP-10).** Com o `<main>` nos dois layouts e nas
> páginas públicas, `region` caiu de 204 para **0**, e com ele a linha
> "Moderado" inteira: `page-has-heading-one` de 7 para 0 e `heading-order` de 6
> para 0 — de 214 ocorrências moderadas para **0**. As linhas "Crítico" e
> "Grave" não mudaram: são A-03, A-04, A-07 e A-08, escopo de MP-11 e MP-13.

---

## 2. O que foi verificado e está correto

Registrado para que etapas seguintes não "consertem" o que funciona:

| Item | Resultado medido |
|---|---|
| Foco visível | 12/12 elementos com `outline` ou `box-shadow` — 0 sem indicador |
| Navegação por teclado | Sidebar inteira alcançável por Tab, na ordem visual |
| Modal — trap de foco | 0 fugas em 25 tabulações; foco inicia dentro do dialog |
| Modal — Escape | Fecha corretamente |
| Modal — rotulagem | `aria-labelledby` presente (Radix) |
| Reflow (WCAG 1.4.10) | Sem scroll horizontal a 640 px e a 320 px |
| Zoom de texto (WCAG 1.4.4) | 200 % sem scroll horizontal e sem perda de conteúdo |
| Alvos de toque (WCAG 2.5.8) | 0 alvos < 24 px a 390 px |
| Uso de cor (WCAG 1.4.1) | Status com rótulo textual + ícone, não só cor |
| `lang` do documento (WCAG 3.1.1) | `pt-BR` em todas as rotas |
| `alt` em imagens (WCAG 1.1.1) | 10/10 na landing; 0 imagens sem `alt` |
| Semântica de controles | 0 `div`/`span` com `onClick` substituindo botão |
| `aria-current` na navegação | Presente no item ativo do menu |

Duas ressalvas de método. O "zoom 200 %" apontou 20 elementos com corte — a
inspeção mostrou serem **ícones da sidebar de 24 px**, não texto: é falso
positivo do detector, e por isso o item consta como aprovado. E o trap de foco
foi verificado no modal de produto; os demais 46 modais de aplicação usam o
mesmo primitivo Radix, mas **não foram medidos individualmente**.

---

## 3. Problemas

Prioridade: **P1** = bloqueia uso por tecnologia assistiva; **P2** = falha WCAG
A/AA com contorno possível; **P3** = boa prática ou impacto localizado.


> **Atualização 20/09/2026 — A-02, A-05, A-06, A-11 e A-16 corrigidos (MP-10).**
> A evidência da tabela abaixo é a medição original de 17/09 e permanece como
> registro do "antes". Remedição com o sistema rodando, nas mesmas 14 rotas:
> `main` presente em 14/14 (era 6/14), `region` = **0** (era 204), skip link em
> todas as rotas com navegação e 1 tabulação até o conteúdo (eram 22), um único
> `h1` por rota em 14/14 (era 0 em 7 rotas e 2 em 3 rotas), `heading-order` = 0
> saltos (eram 6) e 32 itens de navegação em `ul`/`li` (eram 0). Também medido a
> 390 px nas 10 rotas de painel. Detalhes e artefatos em
> `docs/UI-UX-MASTER-PLAN.md`, seção "Execução verificada".
>
> Os demais achados (A-01, A-03, A-04, A-07 a A-10, A-12 a A-15) seguem abertos
> e são escopo de MP-11, MP-12 e MP-13.

| ID | Item | Arquivo / rota | Critério | Evidência | Impacto | Solução | Prio |
|---|---|---|---|---|---|---|---|
| **A-01** | Erro de formulário não é anunciado | `components/admin/ProductModal.tsx:392`; `components/admin/SettingsContent.tsx:446` | WCAG 3.3.1 (A), 4.1.3 (AA) | Submissão vazia do modal de produto: texto "Erro de validação" visível, mas `aria-invalid`=0, `aria-describedby`=0, `role="alert"`=0; foco permanece em `BUTTON:"Criar Produto"` | Usuário de leitor de tela não percebe que a submissão falhou, nem qual campo corrigir. Falha silenciosa | Marcar campo inválido com `aria-invalid="true"`; ligar a mensagem ao campo via `aria-describedby`; publicar o erro em `role="alert"`; mover foco ao primeiro campo inválido | **P1** |
| **A-02** ✅ | Layout do cliente e páginas públicas sem `<main>` | `components/customer/CustomerLayout.tsx` (sem `<main>`); rotas `/`, `/customer-login/`, `/admin-login/`, `/customer/*` | WCAG 1.3.1 (A) | `main`=0 em 8 das 14 rotas; axe `landmark-one-main` em 6 rotas e `region` ×204 no total (132 na landing, 22 em `/customer/suporte`) | Sem landmark principal não há salto direto ao conteúdo; conteúdo fica fora de região nomeada. É a causa da maior parte das 204 ocorrências de `region` | Envolver o conteúdo em `<main>` (um por página) nos dois layouts, como já é feito em `components/store/StoreLayout.tsx:136` | **P1** |
| **A-03** | 68 botões de ícone sem nome acessível | `components/admin/AdminHeader.tsx:22,30`; `LandingPageEditor/StyleControls/ArrayEditor.tsx:124,134`; +64 ocorrências de `size="icon"` | WCAG 4.1.2 (A) | `grep 'size="icon"'` = 68; com `aria-label` = **0**. axe `button-name`: 16 em `/store-panel/usuarios`, 11 em `/configuracoes`, 6 no dashboard, 2 em `/customer/suporte` | Controles anunciados apenas como "botão". Na tela de usuários, 16 ações indistinguíveis por leitor de tela | Adicionar `aria-label` descritivo em cada botão só-ícone (ex.: `aria-label="Notificações"`, `aria-label="Editar usuário"`); considerar lint que exija rótulo quando `size="icon"` | **P1** |
| **A-04** | 62 `SelectTrigger` sem rótulo associado | `AdminContent.tsx`, `AdminCouponsSection.tsx`, `AdminProductsSection.tsx`, `AdminPromotionsOverview/Section.tsx`, `AdminServicesSection.tsx`, `AdminSupportContent.tsx`, `AdminUsersSection.tsx` | WCAG 4.1.2 (A), 3.3.2 (A) | `grep '<SelectTrigger'` = 62; com `aria-label` = **0**. axe `select-name` (crítico) em `/` e `/store-panel/revisoes` | Combobox anunciado sem propósito. Usuário não sabe o que está selecionando | Associar `<Label htmlFor>` ao trigger ou aplicar `aria-label` no `SelectTrigger` | **P1** |
| **A-05** ✅ | Sem skip link — 22 tabulações até o conteúdo | `components/store/StoreLayout.tsx`; todas as rotas de painel | WCAG 2.4.1 (A) | 1.º Tab = `BUTTON "Consulta por Placa"`; primeiro elemento dentro de `<main>` só na **22.ª** tabulação. `skipLink`=false em 14/14 rotas | Usuário de teclado repete ~22 tabulações a cada troca de tela para chegar ao conteúdo | Adicionar "Pular para o conteúdo" como primeiro elemento focável, visível ao receber foco, apontando para o `id` do `<main>` | **P1** |
| **A-06** ✅ | Nenhuma página do painel tem `<h1>` | 6/6 rotas `/store-panel/*` | WCAG 1.3.1 (A) · boa prática (`page-has-heading-one`) | `h1`=0 em dashboard, produtos, clientes, usuários, revisões, configurações. Também `h1`=0 em `/customer-login/` | Sem âncora de topo na hierarquia; navegação por headings começa em nível intermediário | Promover o título de cada página a `<h1>` (um por rota), mantendo o restante da escala | **P2** |
| **A-07** | Contraste abaixo de 4.5:1 — 53 instâncias | Landing (28), `/customer/*` (19), `/store-panel/clientes` e `/revisoes` (4), login cliente (1), 404 (1) | WCAG 1.4.3 (AA) | Medido: `#166df8` sobre `#04122e` = **4.04:1**; `#166df8` sobre `#020817` = 4.36:1; `#166df8` sobre `#f8fafc` = 4.38:1 (botão "Nova Revisão"); `#6b7280` sobre `#e2e4e9` = 3.80:1 (tab do login); `#3b82f6` sobre `#f3f4f6` = 3.34:1 (link do 404) | Texto de baixa legibilidade para visão reduzida e em tela sob luz forte. Afeta a marca (`#166df8`) em toda a landing | Escurecer o azul de marca para texto (ou usar variante só em fundo claro); os casos medidos precisam de ~4.5:1 — vários estão a 0.1–0.5 de distância | **P2** |
| **A-08** | `text-gray-400` como texto — 2.53:1 | 100 ocorrências em `components/`; visível em `/store-panel/clientes` ("Cadastrado: 16/09/2026") | WCAG 1.4.3 (AA) | `#9ca3af` sobre `#ffffff` = **2.53:1**, contra o mínimo de 4.5:1 — pouco mais da metade | Metadados (datas, legendas) praticamente ilegíveis para parte dos usuários | Trocar por `text-gray-600` (≈4.7:1) ou superior no texto; reservar `gray-400` para bordas e ícones decorativos | **P2** |
| **A-09** | Campos de busca só com `placeholder` | `/store-panel/usuarios` ("Buscar por email..."), `/store-panel/produtos` ("Buscar por nome, SKU...") | WCAG 3.3.2 (A), 1.3.1 (A) | `totalCampos`=1 e `semNome`=1 em ambas: sem `<label for>`, sem `aria-label`, sem `<label>` ancestral | `placeholder` não é nome acessível e desaparece ao digitar — usuário perde a referência do campo | Adicionar `<Label>` associado (visualmente oculto com `sr-only` se o layout exigir) ou `aria-label` | **P2** |
| **A-10** | Tabela sem `scope` e sem `caption` | `/store-panel/usuarios` (6 `<th>`, 7 linhas) | WCAG 1.3.1 (A) | `th`=6, `th[scope]`=**0**, `caption`=false | Leitor de tela não associa célula ao cabeçalho; ao navegar célula a célula, o usuário perde de qual coluna é o dado | Adicionar `scope="col"` aos cabeçalhos e `<caption>` (ou `aria-label` na `<table>`) descrevendo o conteúdo | **P2** |
| **A-11** ✅ | Hierarquia de headings salta h1→h3 | `/customer/inicio`, `/perfil`, `/veiculos`, `/suporte` | WCAG 1.3.1 (A) · `heading-order` | 6 saltos medidos: `1->3 em "João Silva"`, `1->3 em "Informações Pessoais"`, `1->3 em "WhatsApp"`. Em `/perfil`, `/veiculos` e `/suporte` há ainda **2 `<h1>` por página** | Navegação por headings sugere subordinação que não existe; dois `<h1>` desfazem a noção de título único | Rebaixar os `h3` para `h2` onde são seção de primeiro nível; manter um único `<h1>` por rota | **P2** |
| **A-12** | Links de rede social sem texto | Landing `/` — Instagram e WhatsApp no rodapé | WCAG 2.4.4 (A), 4.1.2 (A) | axe `link-name` ×2: `<a href="https://instagram.com/m2autocenterpalmital" class="w-10 h-10 rounded-full...">` — só ícone, sem texto nem rótulo | Link anunciado como "link" sem destino; em lista de links do leitor de tela fica indistinguível | `aria-label="Instagram da M2 Auto Center"` e equivalente no WhatsApp | **P2** |
| **A-13** | Barra de progresso sem nome | `components/customer/CustomerDashboard.tsx:8,79,103` — rota `/customer/inicio` | WCAG 1.1.1 (A), 4.1.2 (A) | axe `aria-progressbar-name` (grave) ×1 no `<Progress>` de progresso de fidelidade | Valor numérico anunciado sem dizer a que se refere | Adicionar `aria-label` (ex.: "Progresso do nível de fidelidade") ou `aria-labelledby` apontando ao título visível | **P2** |
| **A-14** | Botão invisível no fluxo de login | `/customer-login/`, `/admin-login/` | WCAG 4.1.2 (A) | axe `button-name` ×1 em cada: `<button type="button" tabindex="-1">` sem conteúdo acessível | Controle sem nome na porta de entrada. `tabindex="-1"` o mantém fora do Tab, o que reduz — mas não elimina — o alcance para leitor de tela | Verificar se o botão é necessário; se for decorativo, `aria-hidden="true"`; se for funcional, dar nome | **P3** |
| **A-15** | Estados de loading/error/empty sem anúncio adequado | `/store-panel/usuarios`, `/produtos`, `/clientes` | WCAG 4.1.3 (AA) | `[aria-live]`=1 por rota (o container de toast do Sonner); nenhuma live region própria para carregamento ou lista vazia | Troca de conteúdo por filtro/busca não é anunciada: a lista muda e o usuário de leitor de tela não recebe sinal | Anunciar resultado da busca/filtro em `role="status"` (ex.: "7 usuários encontrados"); declarar estado de carregamento com `aria-busy` | **P3** |
| **A-16** ✅ | Navegação sem estrutura de lista | `components/store/StoreLayout.tsx` — todas as rotas de painel | Boa prática (WCAG 1.3.1 não exige) | `<nav>`=1, mas `nav ul, nav li`=**0**: itens são `<button>` soltos | Leitor de tela não anuncia "lista de 12 itens" nem a posição atual; perde-se a noção de tamanho do menu | Envolver os itens em `<ul>`/`<li>`. `aria-current` já está correto e deve ser mantido | **P3** |

---

## 4. Agrupamento por causa

Os 16 achados vêm de **5 causas**, o que torna a correção mais barata do que a
lista sugere:

1. **Nome acessível ausente em controle só-ícone** → A-03, A-04, A-12, A-13,
   A-14. São 130+ instâncias de um único hábito: `aria-label` nunca aplicado.
2. **Landmark e hierarquia de documento** → A-02, A-05, A-06, A-11, A-16.
3. **Contraste da paleta** → A-07, A-08. Dois tokens (`#166df8` para texto e
   `gray-400`) respondem por 53 instâncias.
4. **Ciclo de vida de formulário** → A-01, A-09.
5. **Anúncio de mudança dinâmica** → A-15, e a parte de A-01 sobre `role="alert"`.

---

## 5. Ordem sugerida

Sem estimativas de esforço — não foram medidas.

1. **A-01** (erro não anunciado) e **A-02** (`<main>`): maior impacto por
   mudança; A-02 derruba a maior parte das 204 ocorrências de `region`.
2. **A-03** e **A-04**: mecânicos e repetitivos; cabem em varredura única com
   lint para impedir regressão.
3. **A-05**, **A-06**, **A-07**, **A-08**: melhoram todas as telas de uma vez.
4. Demais, por rota.

---

## 6. Limites desta auditoria

- **14 rotas medidas** de 4 faixas. Rotas do inventário **não medidas**:
  demais abas de `/store-panel/*` (pedidos, orçamentos, ordens de serviço,
  serviços, marketplaces, relacionamento, suporte, cupons, promoções,
  relatórios, editor de landing) e demais rotas de `/customer/*`. Ausência de
  achado nelas não é evidência de conformidade.
- **1 modal medido** (produto) de 47 de aplicação. Trap de foco e Escape foram
  confirmados só nele; os demais usam o mesmo primitivo Radix, o que torna o
  resultado provável — mas não verificado.
- **Sem teste com leitor de tela real** (NVDA/JAWS/VoiceOver). Os achados de
  anúncio derivam da árvore de acessibilidade e dos atributos ARIA, não de
  escuta. A-01 e A-15 merecem confirmação com leitor real.
- **Sem avaliação de conteúdo textual**: qualidade de mensagens de erro,
  clareza de rótulo e linguagem simples não foram julgadas.
- Contraste medido pelo axe em elementos com fundo resolvível; sobreposições e
  gradientes podem ter escapado.
- A auditoria não cobre `prefers-reduced-motion`, legendas de mídia nem
  tempo-limite de sessão — não houve elementos desses tipos nas rotas medidas,
  o que não garante que inexistam no restante.

---

## 7. Reprodução

```bash
npm install --no-save axe-core playwright
node .a11y/mkstate.js admin && node .a11y/mkstate.js cust   # sessões
node .a11y/scan.js none            .a11y/t_pub.json  .a11y/r_pub.json  1280
node .a11y/scan.js .a11y/state_admin.json .a11y/t_adm.json  .a11y/r_adm.json  1280
node .a11y/scan.js .a11y/state_cust.json  .a11y/t_cust.json .a11y/r_cust.json 1280
node .a11y/kbd.js        # foco visível, trap de modal, Escape
node .a11y/skip.js       # profundidade de tabulação, skip link
node .a11y/zoom.js       # reflow 320px, zoom 200%, alvos de toque
node .a11y/forms.js      # labels, tabelas, live regions
node .a11y/modalform.js  # validação e anúncio de erro
```

Resultados brutos em `.a11y/r_pub.json`, `.a11y/r_adm.json`, `.a11y/r_cust.json`.
