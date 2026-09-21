# Plano mestre de UI UX

## Objetivo e escopo

Este plano transforma os achados das oito auditorias em uma sequência executável, verificável e reversível. Nenhum código é alterado por este documento. O escopo é o frontend web em `apps/frontend`; o app Flutter continua fora de escopo.

Priorizar, nesta ordem: perda funcional e WCAG A/AA, integridade dos dados e navegação, responsividade, formulários, consistência e redução de dívida. Um identificador de auditoria não some por estar agrupado: a matriz final informa a tarefa que o resolve ou a exceção justificada.

## Princípios de implementação

1. Corrigir causas compartilhadas antes de telas isoladas; não fazer varreduras cosméticas antes de paginação, semântica e rotas.
2. Fazer uma fatia vertical por vez: componente/base, tela-piloto, testes, expansão. Não migrar dezenas de superfícies sem o piloto aprovado.
3. Não alterar contrato de API, regra de negócio, dados persistidos ou destino externo sem confirmação explícita.
4. Preservar padrões que já passam nas auditorias: foco visível, trap/Escape dos dialogs Radix, reflow, zoom, alvos já conformes, `aria-current`, validação por etapa e proteção contra duplo envio.
5. Para acessibilidade, usar semântica nativa primeiro; ARIA complementa, não substitui `label`, `main`, headings, listas e botões reais.
6. Toda mudança de token visual, rota, persistência de rascunho ou remoção deve ter rollback simples e teste de regressão específico.

## Fases e ordem

| Fase | Resultado antes de avançar | Tarefas |
|---|---|---|
| 0. Decisões | escolhas de produto e segurança registradas | MP-00 a MP-04 |
| 1. Base acessível | landmarks, nomes, erros e contraste conformes nas rotas-piloto | MP-10 a MP-13 |
| 2. Shell e dados | sem corte crítico; listas não escondem registros | MP-20 a MP-25 |
| 3. Formulários | preenchimento, validação e recuperação coerentes | MP-30 a MP-34 |
| 4. Navegação e fluxos | Back, deep links e CTAs levam ao destino esperado | MP-40 a MP-46 |
| 5. Consistência | componentes compartilhados adotados de modo incremental | MP-50 a MP-56 |
| 6. Limpeza autorizada | somente código confirmado como obsoleto é removido | MP-60 a MP-62 |

## Backlog executável

Status: `planejada` não autoriza implementação; `decisão necessária`, `dependência externa` e `confirmação necessária` são gates explícitos.

### Fase 0 — decisões antes de código

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-00 | FA-12, NV-03, NV-09 | Escopo de dados de veículo e destino de `/my-account` não está decidido | `CreateVehicleModal*`, `MyAccount`, `customerNavigation` | Aprovar campos mínimos do veículo e decidir migrar Notificações para `/customer` ou manter rota linkada | P1 | dono de produto | mudar fricção/capacidade | decisão necessária |
| MP-01 | D-02, O-01, DV-13 | Há filtro morto de 1.773 linhas e 15 filtros manuais | `AdvancedFilters`, `SmartFilters`, `useAdvancedFilters` | Escolher piloto do legado ou aprovar `FilterBar` mínimo novo; não fazer ambos | P1 | MP-22 | regressão de filtro | decisão necessária |
| MP-02 | FA-08, NV-13 | Rascunho local pode reter PII e mudar expectativa de descarte | modais densos, storage | Definir campos, TTL, aviso e limpeza de rascunho antes de persistir | P1 | segurança/produto | exposição local de dados | decisão necessária |
| MP-03 | DV-05, DV-06, DV-04 | Ações em massa, ordenação e menu podem alterar operação | listagens de catálogo | Definir ações permitidas, confirmação, permissões e ordenações por entidade | P2 | produto/backend | ação destrutiva em lote | decisão necessária |
| MP-04 | NV-11, Q-01, inventário §15 | Arquitetura da landing e remoção de versões órfãs não estão decididas | páginas públicas e `m2/components` | Confirmar landing one-page e fazer diff funcional antes de qualquer remoção | P2 | produto | remover funcionalidade não portada | confirmação necessária |

### Fase 1 — base acessível

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-10 | A-02, A-05, A-06, A-11, A-16 | Landmarks, skip link e hierarquia de headings inconsistentes | `CustomerLayout`, `StoreLayout`, layouts/páginas públicas, headers de página | Um `main` por página, skip link para seu id, um h1 por rota, h2 sequenciais e `ul/li` no nav | P1 | — | baixo; conferir CSS/âncoras | **DONE** — verificado no navegador em 14 rotas (1280 px) e 10 rotas de painel (390 px); axe: 0 ocorrências de `region`, `landmark-one-main`, `page-has-heading-one`, `heading-order`, `list`/`listitem` |
| MP-11 | A-03, A-04, A-09, A-12, A-13, A-14, FA-03, FA-17, O-06 | Controles e campos sem nome acessível | ícones, `SelectTrigger`, buscas, rodapé, login, dashboard, contato/chat | Convenção de labels; corrigir instâncias auditadas e criar lint/teste para ícone sem nome | P1 | MP-10 | rótulo impreciso | planejada |
| MP-12 | A-01, FA-01, FA-04, FA-13, A-15, UX-03 | Erros e mudanças dinâmicas não são localizados/anunciados | modais admin, contas, listas | Adaptador de erro por campo com `aria-invalid`, descrição, alert, foco no primeiro inválido; `aria-busy`/status para resultados | P1 | MP-30 | foco inesperado; validar com leitor real | planejada |
| MP-13 | A-07, A-08 | Texto abaixo do contraste AA | tokens/Tailwind e superfícies medidas | Criar token de azul para texto e substituir `gray-400` usado como texto após medir cada contexto | P2 | inventário de cores | regressão de marca | planejada |

### Fase 2 — shell, responsividade e dados

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-20 | P-01, P-07, P-10, UX-13, L-01 | Shell do mecânico estreita e comportamento mobile diverge | `MechanicSidebar`, `MechanicPanel`, revisões | Rail 72px na faixa intermediária, grid responsivo e confirmar a ação extra mobile | P1 | decisão de UX para UX-13 | navegação mecânico | planejada |
| MP-21 | P-02, P-03, P-04, P-05, P-08, P-09, P-11 | Overflow/cortes e alvos pequenos em cliente, landing e admin | `CustomerDashboard`, `Contact`, `m2/Footer`, `MobileDrawer`, promoções/configurações/perfil/veículos | Aplicar ajustes medidos de padding, `min-w-0`, truncamento/quebra e alvos 24px; testar 320–1440 | P1 | — | baixo | planejada |
| MP-22 | DV-01, DV-02, DV-06, DV-13, DV-15, D-02, O-01 | Listas ocultam dados após 100 e busca/filtro local diverge | `AdminContent`, serviços admin, seções de lista, `ui/pagination` | Paginação e busca/ordenação server-side com debounce, total e estado de filtro; executar piloto Produtos antes de expandir | P1 | MP-01; contrato API confirmado | cache, parâmetros e performance | planejada |
| MP-23 | DV-08, DV-07 | Carregamento antecipa seis coleções e DOM pode crescer demais | `AdminContent`, queries | Carregar por aba e limitar KPIs; virtualizar apenas se a opção final for scroll infinito | P2 | MP-22 | estados de loading | planejada |
| MP-24 | P-06, DV-03, DV-11, DV-14, A-10, O-03 | Tabelas não são utilizáveis/semânticas no mobile | `AdminUsersSection`, `LoyaltyManagement`, `withMobileCards` | Cards abaixo de breakpoint, colunas prioritárias no desktop, caption/scope; piloto Usuários e depois Fidelidade | P1 | MP-11 | equivalência de ações desktop/mobile | planejada |
| MP-25 | DV-04, DV-05, DV-09, DV-12, DV-16, DV-17, DV-18 | Escala e ações de listas são ruidosas ou ambíguas | listas, `ServiceOrdersContent`, `CustomerFavorites` | Menu por item, ações em massa/ordenar conforme MP-03, vazio distinto de filtro, cards extraídos, tooltip/title; investigar DV-18 antes de mudar | P2 | MP-03, MP-22 | ação destrutiva/descoberta | parcialmente bloqueada |

### Fase 3 — formulários

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-30 | FA-02, FA-18, UX-10 | Modais densos não submetem por Enter e pendências são pouco visíveis | 8 `admin/*Modal`, `ProductModal`, `RequestQuoteModal` | `form/onSubmit`, botão submit, resumo de abas pendentes e obrigatoriedade consistente | P1 | MP-12 | submissão dupla/atalhos | planejada |
| MP-31 | FA-05, FA-06, FA-10 | Teclado mobile/autofill ausentes e `alert()` nativo | campos de telefone/CPF/CEP/endereço, uploaders | `type/inputMode/autoComplete` semântico e `toast.error` no lugar de alertas | P2 | MP-11 | máscara incompatível | planejada |
| MP-32 | FA-07, FA-08, NV-13 | Fechar/recarregar perde formulário longo | modais FM1–FM5 e rotas longas | Dialog de descarte no design system; rascunho só conforme política MP-02 | P2 | MP-02, MP-40 | PII e estado desatualizado | parcialmente bloqueada |
| MP-33 | FA-09, FA-11, FA-12 | Máscaras e modelo de cliente/veículo divergem | `masks/formatters`, cadastro cliente/veículo | Consolidar máscara/validação e extrair `CustomerFields`; aplicar decisão MP-00 ao veículo | P2 | MP-00 | validação rejeitar dados legados | parcialmente bloqueada |
| MP-34 | FA-14, FA-15, FA-16, UX-08 | Checkout, contato e detalhe de orçamento têm expectativa ambígua | `QuoteModal`, `CheckoutDrawer`, `Contact` | Testar checkout em ambiente seguro; rotular envio por WhatsApp, separar/rotular visão vs edição e associar labels | P2 | ambiente descartável para checkout | pedido/WhatsApp externo | dependência externa |

### Fase 4 — navegação e fluxo

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-40 | NV-01, NV-02, NV-07, NV-08, UX-05, UX-04, NV-14 | Subviews/wizards sem URL, Back perde contexto e progresso textual diverge | router, `AdminContent`, revisões, OS, `RevisionEditPage` | Sub-rotas de revisão/OS/edição, breadcrumb e contador textual; preservar estado ao trocar rota | P1 | MP-32 para rascunho | links legados e perda de estado | planejada |
| MP-41 | NV-03, NV-04, NV-05, NV-09, NV-12, UX-06, NV-15 | Painel cliente perde deep link, não leva à loja e duplica conta; STAFF recebe shell em URL ambígua | `CustomerPanel`, `CustomerLayout`, drawer/nav, `MyAccount`, `StorePanel` | Redirect dinâmico, link à loja; consolidar conta/notificações conforme MP-00; redirecionar STAFF ao shell canônico; avaliar CTA primário | P1 | MP-00 | quebra de bookmarks | parcialmente bloqueada |
| MP-42 | NV-06 | Navegação mobile do admin esconde operações frequentes | `StoreBottomNavigation`, drawer | Reordenar/promover slots após dados de uso ou decisão do gestor | P2 | pesquisa/decisão de produto | piorar acessos atuais | decisão necessária |
| MP-43 | NV-10 | Dois lookups de placa podem duplicar UX | `PlateLookupOverlay`, `RevisionVehicleLookupDialog` | Comparar fluxos ao vivo; unificar apenas se requisitos forem equivalentes | P3 | sessão/dados de mecânico | fusão indevida | dependência externa |
| MP-44 | NV-11, Q-01 | Landing one-page e páginas órfãs têm intenção incerta | `Navbar`, páginas órfãs, landing | Registrar decisão MP-04; manter one-page ou criar rotas, nunca remover antes do diff | P3 | MP-04 | SEO/links existentes | parcialmente bloqueada |
| MP-45 | UX-01, UX-02, DV-10, UX-11, UX-12, FA-19, D-04, X-08 | Vazios sem próxima ação/orientação, feedback de avaliação ausente e padrão fragmentado | telas cliente/mecânico/suporte, `TicketRating`, `ui/empty-state` | Piloto `EmptyState` em Revisões, Cupons, Orçamentos; CTAs contextuais, hierarquia de suporte e confirmação de avaliação; expandir por lotes | P1 | MP-11 para anúncio live | CTA indevido ao papel | planejada |
| MP-46 | UX-07, UX-09, NV-16, UX-14 | Feedback pós-ação e busca em pedido são fracos | carrinho, listas admin, `CreateOrderModal` | Toast/contador de carrinho, foco/destaque no criado e busca destacada na etapa de itens | P2 | MP-22 para lista paginada | item criado em outra página | planejada |

### Fase 5 — consistência e reutilização

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-50 | D-01, componente §7.1 | Status de pedido diverge em 14 cópias e badges contornam tokens | 14 consumidores, `Badge`, novo `lib/orderStatus` | Mapa único normalizado e variantes semânticas de badge; migração com snapshot de cada status | P2 | catálogo de status backend | cor/rótulo de status | planejada |
| MP-51 | D-03 | Dois uploaders da landing divergem | `ImageUploader*`, editores | Unificar por prop opcional de crop, com teste de upload/crop | P3 | assets e serviço de upload | perda de crop | planejada |
| MP-52 | D-05 | 200 spinners inline sem padrão | novo `Spinner`/`LoadingState`, consumidores | Criar primitivos, migrar primeiro superfícies tocadas nas fases 1–4 e depois por lote | P3 | MP-12 para anúncio de loading | mudança visual ampla | planejada |
| MP-53 | O-02, Q-03 | Geometria de dialogs é reimplementada e modal de serviço diverge | dialogs, `ProductModal`, `ServiceModal` | Testar wrapper em Produto/Serviço e migrar por família, não 31 de uma vez | P2 | MP-30 | foco/scroll de modal | planejada |
| MP-54 | O-04 | Primitivos responsivos existem sem adoção | `ResponsiveGrids`, seções de catálogo | Aplicar somente onde a fase 2 provou benefício; não substituir layouts estáveis por dogma | P3 | MP-21 | regressão de layout | planejada |
| MP-55 | Q-02 | Seletores semelhantes podem precisar permanecer distintos | `CustomerSelector`, `VehicleSelector`, `combobox` | Spike: comparar busca async e cards ricos; documentar permanência ou migrar | P3 | dados de revisão | regressão no wizard | decisão necessária |
| MP-56 | O-05 | Ausência de `AdminPageHeader` pode ser correta em subview | subviews de revisão e shipping | Revisar em contexto durante MP-40; não forçar cabeçalho duplicado | P3 | MP-40 | título duplicado | planejada |

### Fase 6 — limpeza, somente com confirmação

| ID | Origem | Problema | Arquivos afetados | Solução | Prioridade | Dependências | Risco | Status |
|---|---|---|---|---|---|---|---|---|
| MP-60 | Q-01, inventário §15.1–15.3 | Páginas/seções duplicadas e ramo sidebar sem consumidores | páginas órfãs, raiz `components/*`, barrel, `AdminHeader`, `ui/sidebar` | Após MP-04 e busca de referências/build, remover em commits reversíveis | P3 | confirmação explícita | remover uso indireto | confirmação necessária |
| MP-61 | O-01, X-01–X-06, inventário §15.4–15.7 | Código morto de filtro/upload/cards/modal/validação e resíduos versionados | filtros, `ImageUpload`, gallery, picker, cards, modal, `.bak/.old`, CSS, masks | Reaproveitar o que tem tarefa; remover só candidatos confirmados; arquivos `.bak/.old` em commit isolado | P3 | MP-01, MP-33, confirmação explícita | apagar solução futura | confirmação necessária |
| MP-62 | X-07, X-08 | `withMobileCards` e `EmptyState` parecem órfãos, mas são solução necessária | `withMobileCards`, `empty-state` | Não remover; verificar consumidores após MP-24 e MP-45 | P2 | MP-24, MP-45 | perda de reutilização | planejada |

## Execução verificada

### MP-10 — landmarks, skip link, um h1 por rota e nav em lista · **DONE** (20/09/2026)

Medido com o stack rodando (`docker compose`, frontend de produção), não por
leitura de código. Artefatos: `.a11y/mp10.js` (checagem específica da tarefa),
`.a11y/scan.js` (axe-core) e `.a11y/r_pub_pos.json`, `.a11y/r_adm_pos.json`,
`.a11y/r_cust_pos.json`.

**Antes → depois, nas 14 rotas da auditoria:**

| Medida | Auditoria (17/09) | Agora |
|---|---:|---:|
| `main` presente | 6 de 14 rotas | **14 de 14** |
| `region` (conteúdo fora de landmark) | 204 ocorrências | **0** |
| Rotas com skip link | 0 de 14 | **10 de 10 com navegação** ¹ |
| Tabulações até o conteúdo (painel) | 22 | **1** |
| `h1` por rota | 0 em 7 rotas; 2 em 3 rotas | **exatamente 1 em 14** |
| Saltos de heading (`heading-order`) | 6 | **0** |
| Itens de nav em `ul`/`li` (painel) | 0 | **32** (desktop) / **36** (390 px) |

¹ As 4 rotas sem skip link são as que não têm navegação antes do conteúdo
(`/customer-login/`, `/admin-login/`, 404): não há o que pular.

**Cobertura da medição:** 14 rotas a 1280 px (4 públicas, 6 do painel, 4 do
cliente) e 10 rotas de painel a 390 px, com sessões reais de admin e cliente.
Rotas extras conferidas por terem listas com dados: `/store-panel/servicos`,
`/store-panel/cupons`, `/store-panel/pedidos`.

**Geometria da navegação conferida** em 390, 768, 1280 e 1440 px após a
conversão para `ul`/`li`: coordenadas e tamanhos dos itens inalterados, os três
estágios da sidebar preservados (barra inferior < 768, rail de 72 px até
1399 px, 288 px em 1440 px) e nenhum overflow horizontal introduzido.

**Decisões de implementação:**

- `SkipToContent` (`components/layout/SkipToContent.tsx`) exporta também
  `MAIN_CONTENT_ID`, para que o link e o `<main id>` não possam divergir. O
  `<main>` recebe `tabIndex={-1}` porque o `href` move o scroll mas não o foco.
- `CardTitle` ganhou a prop opcional `as`, com `h3` como padrão: corrige a
  hierarquia das rotas auditadas sem migrar as centenas de cards existentes
  nem mudar o visual.
- `AdminPageHeader` passou a emitir `h1` (prop `as` disponível para subviews).
  Em contrapartida, os títulos de marca dos shells (`StoreHeader`,
  `CustomerLayout`) deixaram de ser `h1` e viraram `<p>`: eram branding, não
  título de rota, e produziam o segundo `h1` de A-11.
- No mobile da oficina o cabeçalho sai por CSS (`desktop-only`), então
  `MechanicPanel` emite um `h1` `sr-only md:hidden` — mesmo limiar de 768 px,
  para nunca haver dois.
- Os `li` usam `display: contents` onde o item participava direto de um flex ou
  de uma grid, preservando a geometria; onde o container usava `space-y-*`, a
  classe acompanhou a lista, que passou a ser o filho direto do `nav`.
- Cartão de perfil do cliente e FAB do WhatsApp foram envolvidos em `<aside>`
  nomeado: eram os 29 nós que ainda ficavam fora de landmark depois do `main`.

**Fora do escopo, registrado e não corrigido aqui:**

- `/customer/inicio` a 390 px tem overflow horizontal de 1 px, causado pela
  grid `grid-cols-2` do bloco de estatísticas (mudança de responsividade já
  presente no working tree, não do MP-10). Tentativas de contê-lo com
  `min-w-0`/`break-words` pioraram a medição e foram revertidas. Pertence a
  **MP-21**, que trata overflow em 320–1440 px.
- O gateway (`infra/nginx/conf.d/default.conf`) aponta `frontend:3000`, mas o
  nginx do frontend serve na porta 80: o painel não abre por
  `http://localhost:<APP_PORT>/`, só a API. Defeito de infra pré-existente,
  alheio a esta fase; a medição usou um proxy temporário.
- O seed (`apps/backend/prisma/seed.ts`) falha em `seedChecklistData` por
  `contactPage` obrigatório ausente em `landingPageConfig`; o banco ficou com
  dados parciais, suficientes para a medição.
- `CustomerFavorites.test.tsx` usa `jest.mock` sob Vitest e falha por `jest is
  not defined` — falha pré-existente, idêntica antes e depois desta fase.

**Testes executados:** typecheck (limpo), lint nos arquivos alterados (apenas
erros pré-existentes de `no-explicit-any`/`exhaustive-deps` em linhas não
tocadas), build de produção (ok), `vitest run` (1 passa, 1 falha pré-existente),
e a verificação no navegador descrita acima.

## Dependências críticas

`MP-01 → MP-22`; `MP-02 → MP-32`; `MP-00 → MP-33/MP-41`; `MP-22 → MP-23/MP-25/MP-46`; `MP-12 → MP-30`; `MP-30 → MP-53`; `MP-40 → MP-56`; `MP-24 e MP-45 → MP-62`; decisões de remoção `MP-04/MP-01/MP-33 → MP-60/MP-61`.

## Riscos e controles

| Risco | Controle |
|---|---|
| Regressão de rotas/deep links | testes de URL, Back/Forward, redirects e links antigos antes/depois de MP-40/41 |
| Busca/paginação mostra conjunto incorreto | contrato de parâmetros/resposta, testes com >100 registros e busca de item fora da página 1 |
| Ação em massa destrói dados | escopo limitado, confirmação, permissão, feedback e ambiente descartável |
| Rascunho expõe PII | política MP-02, TTL, limpeza no sucesso/logout e nenhuma sincronização remota automática |
| Acessibilidade “passa no DOM” mas falha em uso | axe + teclado + NVDA/VoiceOver para erros/live regions |
| Refactor amplo altera comportamento | piloto, snapshots e migração por família; commits pequenos e reversíveis |

## Critérios de aceite

1. A página 1 não limita silenciosamente listagens: total, paginação/busca server-side e item 199 são acessíveis em base com 237 registros.
2. Em 320, 390, 768, 834, 1024, 1280 e 1440 px não há os overflows/cortes listados em P-01 a P-11; links auditados têm ao menos 24 px onde aplicável.
3. Nas rotas cobertas, axe não reporta os tipos de A-01 a A-16; há um `main`, skip link, h1 único e nome acessível para todos os controles auditados.
4. Os modais densos submetem por Enter, mostram erro por campo, anunciam o erro e levam foco ao primeiro campo inválido sem duplo envio.
5. Back/Forward e deep links funcionam nas novas sub-rotas; o cliente retorna ao destino solicitado após login.
6. Estados vazios auditados oferecem orientação/CTA adequada ao papel; criar item mostra confirmação e torna o resultado localizável.
7. Nenhum arquivo é removido sem decisão registrada, busca de referências, build/teste e commit isolado.

## Testes necessários

| Camada | Testes |
|---|---|
| Unitário | normalização de status, máscaras, parâmetros de busca/paginação, regras de CTA e rascunho |
| Componente | `FilterBar`, `EmptyState`, cards mobile, labels/erros, `ResponsiveDialogContent`, loaders |
| Integração | formulários por Enter/erro/foco, paginação e busca remota, criação+destaque, redirects cliente/admin |
| E2E | 14 fluxos do inventário, em especial FL2, FL4, FL6, FL10, FL11 e FL14, em banco descartável |
| Responsivo | Playwright nas sete larguras dos critérios de aceite, incluindo modais abertos |
| Acessibilidade | axe nas 14 rotas e rotas alteradas; Tab, skip link, Escape/trap; NVDA ou VoiceOver para MP-12/A-15 |
| Visual | screenshots antes/depois de landing, shells, dialogs e tabelas/carts mobile |

## Tarefas não autorizadas ou que exigem confirmação

- Remover qualquer código/arquivo órfão, inclusive `.bak`/`.old`, páginas públicas e componentes da raiz: MP-60/61.
- Escolher entre landing one-page e novas rotas, ou promover páginas órfãs: MP-04/44.
- Alterar campos obrigatórios do cliente/veículo: MP-00/33.
- Persistir rascunho de formulário no dispositivo: MP-02/32.
- Introduzir ações em massa, ordenar dados ou mudar confirmação de operações: MP-03/25.
- Alterar integração/experiência de WhatsApp ou submeter checkout real: MP-34; depende de ambiente descartável e do serviço externo.

## Matriz de rastreabilidade auditoria → plano

Cada célula lista todos os IDs de origem e seu destino. `E-` é exceção justificada; não é tarefa omitida.

| Auditoria | IDs identificados | Destino no plano |
|---|---|---|
| Responsiveness | P-01, P-07, P-10 | MP-20 |
| Responsiveness | P-02, P-03, P-04, P-05, P-08, P-09, P-11 | MP-21 |
| Responsiveness | P-06 | MP-24 |
| Component | D-01 | MP-50 |
| Component | D-02, O-01 | MP-01, MP-22 |
| Component | D-03 | MP-51 |
| Component | D-04, X-08 | MP-45, MP-62 |
| Component | D-05 | MP-52 |
| Component | Q-01 | MP-04, MP-44, MP-60 |
| Component | Q-02 | MP-55 |
| Component | Q-03, O-02 | MP-53 |
| Component | O-03, X-07 | MP-24, MP-62 |
| Component | O-04 | MP-54 |
| Component | O-05 | MP-56 |
| Component | O-06 | MP-11 |
| Component | X-01–X-06 | MP-61 |
| Form | FA-01, FA-04, FA-13 | MP-12 |
| Form | FA-02, FA-18 | MP-30 |
| Form | FA-03, FA-17 | MP-11 |
| Form | FA-05, FA-06, FA-10 | MP-31 |
| Form | FA-07, FA-08 | MP-32 |
| Form | FA-09, FA-11, FA-12 | MP-33 |
| Form | FA-14, FA-15, FA-16 | MP-34 |
| Form | FA-19 | MP-45 (sucesso/feedback no suporte) |
| Data view | DV-01, DV-02, DV-06, DV-13, DV-15 | MP-22 |
| Data view | DV-03, DV-11, DV-14 | MP-24 |
| Data view | DV-04, DV-05, DV-09, DV-12, DV-16, DV-17, DV-18 | MP-25 |
| Data view | DV-07, DV-08 | MP-23 |
| Data view | DV-10 | MP-45 |
| Navigation | NV-01, NV-02, NV-07, NV-08, NV-14 | MP-40 |
| Navigation | NV-03, NV-04, NV-05, NV-09, NV-15 | MP-41 |
| Navigation | NV-06 | MP-42 |
| Navigation | NV-10 | MP-43 |
| Navigation | NV-11 | MP-44 |
| Navigation | NV-12 | MP-41 (redirecionar STAFF ao shell canônico) |
| Navigation | NV-13 | MP-32 |
| Navigation | NV-16 | MP-46 |
| UX flow | UX-01, UX-02, UX-11, UX-12 | MP-45 |
| UX flow | UX-03 | MP-12 |
| UX flow | UX-04, UX-05 | MP-40 |
| UX flow | UX-06 | MP-41 |
| UX flow | UX-07, UX-09, UX-14 | MP-46 |
| UX flow | UX-08 | MP-34 |
| UX flow | UX-10 | MP-30 |
| UX flow | UX-13 | MP-20 |
| Accessibility | A-01, A-15 | MP-12 |
| Accessibility | A-02, A-05, A-06, A-11, A-16 | MP-10 |
| Accessibility | A-03, A-04, A-09, A-12, A-13, A-14 | MP-11 |
| Accessibility | A-07, A-08 | MP-13 |
| Accessibility | A-10 | MP-24 |
| Inventory | §15.1–§15.3 | MP-04, MP-60 |
| Inventory | §15.4–§15.7 | MP-01, MP-33, MP-54, MP-61 |
| Inventory | §15.6 (`.bak/.old`) | MP-61 |

### Exceções justificadas

| ID | Classificação | Justificativa | Destino |
|---|---|---|---|
| L-01 a L-05 | não aplicável como fusão | São separações legítimas; L-01 ainda recebe ajuste geométrico em MP-20 e L-05 revisão em MP-56 | preservados |
| Auditoria de acessibilidade: 20 ícones “cortados” em zoom | falso positivo | Detector apontou ícones de 24 px, não texto; inspeção visual aprovou | nenhum código |
| DV-18 | bloqueado por verificação externa | Diferença de contagem pode ser card exclusivo mobile; requer comparar itens com dados reais antes de alterar | MP-25 |
| NV-10, UX-13 | bloqueados por verificação em execução | Auditoria pediu confirmação de intenção/contexto com sessão/dados adequados | MP-20, MP-43 |
| FA-15/FA-16/UX-08 | bloqueados por ambiente externo | Percorrer checkout e WhatsApp sem gravar/enviar exige ambiente descartável/integração controlada | MP-34 |

## Conferência matemática

| Origem | Identificados | Mapeados em tarefa MP | Exceções dentro da contagem | Saldo não mapeado |
|---|---:|---:|---:|---:|
| Responsiveness | 11 | 11 | 0 | 0 |
| Component | 22 | 22 | 0 | 0 |
| Form | 19 | 19 | 0 | 0 |
| Data view | 18 | 18 | 0 | 0 |
| Navigation | 16 | 16 | 0 | 0 |
| UX flow | 14 | 14 | 0 | 0 |
| Accessibility | 16 | 16 | 0 | 0 |
| **Total** | **116** | **116** | **0** | **0** |

As exceções listadas não reduzem esse total: L-01–L-05 não integram os 22 achados do Component Audit; o falso positivo de zoom também não integra A-01–A-16. O inventário não possui contagem de “achados” com IDs; seus 7 blocos de código sem referência foram mapeados separadamente para MP-01, MP-04, MP-33, MP-54, MP-60 e MP-61.

Portanto: **116 problemas identificados = 116 problemas mapeados no plano + 0 problemas sem tratamento**. Exceções adicionais foram demonstradas acima, sem serem usadas para inflar a cobertura.
