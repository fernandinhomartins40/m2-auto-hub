# Auditoria de Arquitetura de Navegação — m2-auto-hub

> **Etapa de auditoria. Nenhum código foi alterado.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §11 (15 mecanismos de
> navegação) e §12 (14 fluxos + 6 secundários), mais as 17 rotas de §1.
>
> **Método:** aplicação real rodando (`localhost:8080`), navegação dirigida com
> Playwright — cliques reais, `goBack()` do navegador, deep links com e sem
> sessão. Tudo marcado **[MEDIDO]** vem dessas execuções.
>
> Data: 17/09/2026 · Base: branch `main`

---

## 1. Resumo executivo

A espinha dorsal da navegação está **bem projetada**, e isso precisa ser dito
antes das críticas: cada aba dos três painéis tem URL própria e legível
(`/store-panel/ordens-de-servico`), slug inválido cai no dashboard **corrigindo a
barra de endereços**, e a sidebar do admin agrupa 20 itens em 5 seções
equilibradas. O painel do cliente distribui 9 abas em 4 no bottom nav + 5 no
drawer, **sem sobreposição** — desenho consciente.

O problema não é a navegação entre telas. É o que acontece **dentro** delas e nas
bordas do sistema:

> **O trabalho real do painel acontece em sub-views que não existem na URL.**
> As 3 sub-views de Revisões e o formulário de Ordem de Serviço são estado de
> componente. Consequência medida: o Voltar do navegador, em vez de retornar à
> lista, **sai da aplicação inteira**.

E há uma tela inteira fora do mapa:

> **`/my-account` — 597 linhas, rota registrada, protegida por sessão, com uma
> aba de "Notificações" que não existe em nenhum outro lugar — e nenhum menu do
> sistema aponta para ela.** Só se chega digitando a URL.

**16 achados:** 3 CRÍTICA, 5 ALTA, 5 MÉDIA, 3 BAIXA.

---

## 2. O que está bem resolvido (verificado — não mexer)

Registrado primeiro para que a etapa de correção não desfaça o que funciona.

| Aspecto | Evidência [MEDIDO] |
|---|---|
| **URL por aba** | As 32 abas dos 3 painéis têm slug próprio em português (`adminNavigation.ts`, `customerNavigation.ts`, `mechanicNavigation.ts`). Recarregar mantém a tela; o link é compartilhável |
| **Slug inválido se autocorrige** | `/store-panel/slug-inexistente` → **`/store-panel/dashboard`**, com a URL corrigida (não fica rota fantasma na barra). Implementado em `StorePanel.tsx:33-37` |
| **Redirects de entrada** | `/store-panel` → `/dashboard`, `/admin` → `/store-panel/dashboard`, `/admin/qualquer` → idem, `/app` → `/`. Todos funcionam |
| **Deep link protegido do admin** | `/store-panel/produtos` sem sessão → `/admin-login/?redirect=%2Fstore-panel%2Fprodutos` — **destino exato preservado** ([ProtectedAdminRoute.tsx:34](apps/frontend/src/components/admin/ProtectedAdminRoute.tsx#L34)) |
| **Agrupamento da sidebar** | 20 itens em 5 seções: Operação (5), Catálogo (3), Clientes (4), Marketing (3), Gestão (5). Distribuição equilibrada e semanticamente coerente |
| **Bottom nav do cliente** | 4 itens diretos + 5 no drawer = as 9 abas, **sem duplicar nenhuma**. Desenho correto para mobile |
| **Wizard de revisão** | Indicador visual de etapa presente (`Veículo · Cliente · Checklist · Orçamento`), com "Voltar" entre passos |
| **Botão de placa no bottom nav** | Ação mais frequente da oficina promovida ao centro da barra — decisão acertada de hierarquia |

---

## 3. Matriz de achados

### CRÍTICA

| ID | Fluxo/Rota | Caminho atual | Problema | Evidência | Proposta | Impacto | Prioridade |
|---|---|---|---|---|---|---|---|
| **NV-01** | FL11 · `/store-panel/revisoes` | Revisões → botão "Agendamentos" / "Listar Revisões" / "Nova Revisão" | **3 telas distintas compartilham uma URL.** Estado em `useState`, não em rota | **[MEDIDO]** Cliquei "Listar Revisões" e depois "Nova Revisão": URL permaneceu `/store-panel/revisoes` nas três. Em seguida, **Voltar do navegador → `about:blank`** (saiu da aplicação). Causa: [AdminContent.tsx:186](apps/frontend/src/components/admin/AdminContent.tsx#L186) `useState<'appointments'\|'list'\|'create'>` | Sub-rotas: `/revisoes/agendamentos`, `/revisoes/lista`, `/revisoes/nova` | **Perda de trabalho.** O operador no meio do wizard de 4 passos aperta Voltar esperando o passo anterior e perde tudo. Nenhuma das 3 telas é compartilhável por link | **CRÍTICA** |
| **NV-02** | FL10 · `/store-panel/ordens-de-servico` | OS → "Nova OS" abre formulário **na mesma tela** | Formulário de OS não tem URL; Voltar sai da aplicação | **[MEDIDO]** Após abrir o formulário, URL continuou `/store-panel/ordens-de-servico`; **Voltar → `about:blank`**. Causa: [ServiceOrdersContent.tsx:61](apps/frontend/src/components/admin/ServiceOrdersContent.tsx#L61) `useState<OsView>({kind:'list'})` | `/ordens-de-servico/nova` e `/ordens-de-servico/:id` | Mesma perda de NV-01, agravada: OS é formulário longo (11 campos). Não dá para mandar link de uma OS específica | **CRÍTICA** |
| **NV-03** | `/my-account` | **Nenhum** — só digitando a URL | Tela completa (597 l.) **inalcançável pela interface**, contendo funcionalidade exclusiva | **[MEDIDO]** A rota existe ([App.tsx:56](apps/frontend/src/App.tsx#L56)), exige sessão, e renderiza 3 abas: **Orçamentos, Pedidos, Notificações**. `grep "my-account"` em todo o `src`: só o próprio arquivo e o guard de auth — **zero links**. "Notificações" **não existe** em `customerNavigation.ts` | Decidir: (a) absorver "Notificações" como 10ª aba de `/customer` e aposentar a rota, ou (b) linká-la. Orçamentos e Pedidos já são duplicatas de `/customer/orcamentos` e `/customer/pedidos` | **Funcionalidade construída e invisível.** O cliente não tem como ver suas notificações | **CRÍTICA** |

### ALTA

| ID | Fluxo/Rota | Caminho atual | Problema | Evidência | Proposta | Impacto | Prioridade |
|---|---|---|---|---|---|---|---|
| **NV-04** | FL3 · `/customer/*` | Deep link sem sessão → login → **sempre `/customer/inicio`** | Destino do deep link é **descartado** no painel do cliente | **[MEDIDO]** `/customer/favoritos` sem sessão → `/customer-login/?redirect=%2Fcustomer` (não `%2Fcustomer%2Ffavoritos`). Causa: [CustomerPanel.tsx:54](apps/frontend/src/pages/CustomerPanel.tsx#L54) tem o redirect **hardcoded**. O admin faz certo, montando dinamicamente | Copiar o padrão do admin: `encodeURIComponent(location.pathname + location.search)` | Link de campanha ou e-mail apontando para uma aba específica sempre joga o cliente no início. **Inconsistência entre as duas áreas** | **ALTA** |
| **NV-05** | Painel do cliente (todas as abas) | — | **Nenhuma saída para a loja.** O cliente fica preso no painel | **[MEDIDO]** `/customer/inicio` em 1280px e 390px: **0 tags `<a>` na página**, nenhum link para `/`. Enquanto isso, o admin tem "Voltar ao Site" ([Sidebar.tsx:151](apps/frontend/src/components/admin/Sidebar.tsx#L151)) | Adicionar "Ir para a loja" no menu lateral e no drawer do cliente | Contradição funcional: `CustomerPanel` monta `<CartDrawer>` ([linha 88](apps/frontend/src/pages/CustomerPanel.tsx#L88)) — o cliente tem carrinho, mas **nenhum caminho para comprar**. Precisa usar o botão Voltar ou digitar a URL | **ALTA** |
| **NV-06** | `/store-panel/*` em mobile | Bottom nav (3 seções) → "Mais" → drawer (20 itens) | **17 das 20 seções ficam a 2 toques**, atrás de um menu genérico | **[MEDIDO]** Em 390px: 17 elementos de navegação visíveis, mas só **Início, Pedidos, Clientes** alcançáveis em 1 toque. As outras 17 exigem abrir "Mais". Em 1280px, 28 elementos diretos | Promover ao bottom nav as 1–2 seções mais usadas da oficina (Ordens de Serviço, Revisões) ou tornar os slots configuráveis | Operação de oficina em celular paga 1 toque extra nas telas de trabalho, enquanto "Pedidos" e "Clientes" ocupam slots fixos | **ALTA** |
| **NV-07** | Todo o admin | — | **Nenhum breadcrumb em todo o sistema** | `grep -rl "Breadcrumb"` fora de `components/ui`: **0 arquivos**. O primitivo `ui/breadcrumb.tsx` existe e tem 0 consumidores | Trilha nas telas com sub-view (Revisões, OS, edição de revisão), junto com NV-01/NV-02 | Sem breadcrumb **e** sem URL de sub-view (NV-01/02), o usuário perde a noção de onde está dentro da seção | **ALTA** |
| **NV-08** | FL11 · `RevisionEditPage` | Revisões → lista → editar | Edição de revisão é página inteira, mas **sem URL própria** | `RevisionEditPage.tsx:306` tem botão "Voltar para a lista" — solução local para um problema que a rota resolveria. 3 importadores, nenhum com rota | `/store-panel/revisoes/:id` | Revisão específica não é compartilhável por link, e o Voltar do navegador não funciona como esperado | **ALTA** |

### MÉDIA

| ID | Fluxo/Rota | Caminho atual | Problema | Evidência | Proposta | Impacto | Prioridade |
|---|---|---|---|---|---|---|---|
| **NV-09** | `/my-account` vs `/customer/*` | duas rotas | **Telas duplicadas:** Orçamentos e Pedidos existem nos dois lugares | **[MEDIDO]** `/my-account` renderiza abas "Orçamentos" e "Pedidos"; `/customer/orcamentos` e `/customer/pedidos` fazem o mesmo. 597 linhas paralelas a `CustomerQuotes` + `CustomerOrders` | Resolver junto de NV-03: manter uma implementação | Manutenção dobrada e risco de divergência de comportamento entre as duas versões | **MÉDIA** |
| **NV-10** | FL12 · Consulta por placa | Botão central (mobile) · sidebar (desktop) | Dois componentes distintos para a mesma função | `PlateLookupOverlay` (acionado pelo bottom nav) e `RevisionVehicleLookupDialog` (dentro do wizard) — inventário §12 registra os dois no mesmo fluxo | Confirmar se a divergência é intencional (contextos diferentes) ou acidental | Se forem equivalentes, o operador aprende duas interfaces para a mesma consulta | **MÉDIA** |
| **NV-11** | Landing `/` | Navbar com âncoras | Navegação pública é **só âncora de scroll**, sem rota | [Navbar.tsx:34](apps/frontend/src/components/Navbar.tsx#L34): `scrollIntoView`. Não há `/produtos`, `/servicos`, `/promocoes` como rotas — e existem 3 páginas órfãs (`About`, `Contact`, `Promocoes`) que seriam exatamente isso | Decidir: manter one-page (legítimo) **ou** promover as órfãs a rotas | Sem URL por seção, não há como enviar link direto para "Serviços" nem medir acesso por seção. **Não é erro** — é decisão não registrada | **MÉDIA** |
| **NV-12** | `/store-panel` (STAFF) | Mesma URL, dois shells | Um admin `STAFF` recebe `MechanicPanel` em `/store-panel` | [StorePanel.tsx:47](apps/frontend/src/pages/StorePanel.tsx#L47): fork por papel. As telas M1–M3 ficam acessíveis por **duas URLs distintas** | Redirecionar STAFF para `/mechanic-panel` em vez de renderizar outro shell na mesma rota | URL deixa de identificar a tela; dificulta suporte ("me manda o link") e análise de uso | **MÉDIA** |
| **NV-13** | Modais de criação | Lista → modal | Modais de criação/edição **não têm URL** | Padrão em todo o admin: `ProductModal`, `CreateOrderModal`, `CreateQuoteModal` etc. abrem por estado | Para os wizards longos (Pedido, Orçamento, OS), avaliar rota própria; modais curtos podem continuar como estão | Recarregar a página perde o formulário (agrava `FORM-AUDIT` FA-07/FA-08). **Ressalva:** modal sem URL é padrão aceitável — o problema é concentrar formulários de 17–21 campos neles | **MÉDIA** |

### BAIXA

| ID | Fluxo/Rota | Caminho atual | Problema | Evidência | Proposta | Impacto | Prioridade |
|---|---|---|---|---|---|---|---|
| **NV-14** | FL11 · wizard | 4 passos | Sem indicação textual de progresso ("Passo 2 de 4") | **[MEDIDO]** Busca por `Passo \d\|Etapa \d\|\d/4` no wizard aberto: **0 ocorrências**. Há indicador **visual** (Veículo · Cliente · Checklist · Orçamento), que funciona | Acrescentar contador textual junto ao indicador visual | Menor: o indicador visual já orienta. Ganho de clareza e acessibilidade | **BAIXA** |
| **NV-15** | `/customer/*` | — | Cliente não tem equivalente ao "Consulta por Placa" do admin | Bottom nav do cliente tem 5 slots, nenhum com ação destacada | Avaliar ação primária para o cliente (ex.: "Agendar revisão") | Assimetria de hierarquia entre as duas áreas | **BAIXA** |
| **NV-16** | Pós-criação/edição | Modal fecha → lista recarrega | Após criar, o usuário **não é levado ao item criado** | `AdminContent.tsx:2292-2310`: `onSuccess` faz `loadData()` + fecha o modal. Sem destaque, scroll ou navegação ao novo registro | Rolar até o item e destacá-lo brevemente | Em lista de 100 itens (ver `DATA-VIEW-AUDIT` DV-01), o usuário não vê o que acabou de criar | **BAIXA** |

---

## 4. Sobre agrupar sem remover funcionalidade

O pedido pede explicitamente para não confundir "menos telas" com remoção. Minha
avaliação:

| Candidato a agrupamento | Veredito |
|---|---|
| **`/my-account` + `/customer/*`** | **Agrupar (NV-03/NV-09).** Aqui há ganho real: elimina duas telas duplicadas **e** resgata "Notificações", que hoje está inacessível. Nenhuma capacidade se perde — uma é recuperada |
| **Revisões + Agendamentos + OS** | **Não agrupar.** São três objetos de domínio distintos (agenda, execução de revisão, ordem de serviço). O problema não é estarem separados — é as 3 sub-views de Revisões dividirem uma URL (NV-01) |
| **20 itens da sidebar** | **Manter.** As 5 seções já agrupam bem. Reduzir esconderia funcionalidade |
| **Wizards de 4 passos** | **Manter as etapas.** São dependentes em cadeia (já avaliado em `FORM-AUDIT` §4). O que falta é URL por passo (NV-01), não menos passos |
| **Landing one-page** | **Decisão do produto (NV-11).** One-page é escolha válida; só não está registrada, e existem 3 páginas órfãs que sugerem que houve outra intenção |

**Conclusão:** há **um** agrupamento que vale a pena (NV-03/09). O resto dos
ganhos vem de dar URL ao que já existe — o que *aumenta* capacidade (links
compartilháveis, Voltar funcionando), sem tirar nada.

---

## 5. Cobertura

### 5.1 Por mecanismo do inventário §11

| ID | Mecanismo | Auditado | Achados |
|---|---|---|---|
| N1 | Sidebar admin | ✅ | NV-07 (sem breadcrumb) · agrupamento OK |
| N2 | Bottom nav admin | ✅ | NV-06 |
| N3 | Drawer "Mais" admin | ✅ | NV-06 |
| N4 | Header admin | ⚠️ **PENDING #3** | — |
| N5 | Bottom nav cliente | ✅ | Sem achado — bem distribuído |
| N6 | Drawer cliente | ✅ | NV-05 (sem saída para a loja) |
| N7 | Menu lateral cliente | ✅ | NV-05 |
| N8 | Sidebar mecânico | ⚠️ **PENDING #2** | — |
| N9 | Navbar público | ✅ | NV-11 |
| N10 | Footer público | ⚠️ **PENDING #4** | — |
| N11 | Roteamento por slug | ✅ | Funciona bem (§2); NV-01/02/08 são o que ficou de fora dele |
| N12 | Central de notificações | ⚠️ **PENDING #5** | — |
| N13 | Guardas de rota | ✅ | NV-04 |
| N14 | FAB WhatsApp | ✅ | Sem achado |
| N15 | Banner PWA | ⚠️ **PENDING #6** | — |

**10 de 15 mecanismos auditados.**

### 5.2 Rotas testadas em execução

9 deep links exercitados com e sem sessão: `/store-panel/produtos`,
`/customer/favoritos`, `/my-account`, `/store-panel/slug-inexistente`,
`/store-panel`, `/admin`, `/admin/qualquer`, `/app`, `/customer`.

### 5.3 PENDING

| # | Item | Por que | O que seria preciso |
|---|---|---|---|
| **1** | **Fluxos completos FL1–FL14 ponta a ponta** | Auditei as **transições de navegação**, não os fluxos inteiros — percorrer FL2 (checkout) ou FL10 (criar pedido) até o fim gravaria dados | Ambiente descartável |
| **2** | **N8 — navegação do mecânico** | Foco da rodada foi admin + cliente. O shell já foi coberto em `RESPONSIVENESS-AUDIT` (P-01), mas não a arquitetura de navegação | Rodar os mesmos testes com sessão de mecânico |
| **3** | **N4 — header do admin** | `StoreHeader` tem busca e notificações; **não testei** o que a busca do header faz nem se é global | Exercitar a busca do header |
| **4** | **N10 — links do footer público** | Medi os alvos de toque em `RESPONSIVENESS-AUDIT` (P-04); **não segui os destinos** de cada link | Clicar cada link e registrar destino |
| **5** | **N12 — central de notificações** | `NotificationCenter` existe no admin; não abri nem verifiquei se navega para o item de origem | Abrir com notificações reais no banco |
| **6** | **N15 — banner de instalação PWA** | Fluxo de instalação depende do navegador e de `beforeinstallprompt` | Navegador com suporte a instalação |
| **7** | **NV-10 — os dois lookups de placa** | Confirmei que são componentes distintos; **não comparei** as interfaces lado a lado | Abrir os dois e comparar |
| **8** | **Estado após excluir** | Verifiquei o pós-criação (NV-16). O pós-exclusão (a lista mantém o scroll? há desfazer?) **não foi medido** | Excluir um registro — gravaria no banco |

**A cobertura não é total:** 8 itens seguem `PENDING`, incluindo 5 dos 15
mecanismos de navegação.

---

## 6. Contagens finais

- **Mecanismos inventariados:** 15 · **auditados:** **10** · **PENDING:** 5.
- **Rotas exercitadas em execução:** 9 deep links + 2 fluxos de sub-view.
- **Achados:** **16** — 3 CRÍTICA, 5 ALTA, 5 MÉDIA, 3 BAIXA.
- **Itens PENDING:** **8**.
- **Telas duplicadas confirmadas:** 2 (Orçamentos e Pedidos, em `/my-account` vs `/customer/*`).
- **Rotas órfãs de navegação:** 1 (`/my-account`).

---

## 7. Gate

**Nada foi implementado.**

Ordem sugerida, por relação impacto/risco:

1. **NV-05** (ALTA, risco nulo) — link "Ir para a loja" no painel do cliente.
   Uma linha resolve um beco sem saída.
2. **NV-04** (ALTA, risco baixo) — redirect dinâmico no cliente, copiando o
   padrão que o admin já usa.
3. **NV-03 + NV-09** (CRÍTICA/MÉDIA, **decisão antes de código**) — o destino de
   `/my-account`. É decisão de produto: absorver "Notificações" no painel ou
   linkar a rota. Não faça nada aqui sem essa definição.
4. **NV-01 + NV-02 + NV-08** (CRÍTICA/ALTA, risco médio) — dar URL às sub-views.
   São o mesmo trabalho e devem ser feitos juntos; o padrão de slug já existe
   em `adminNavigation.ts` e é fácil de estender.
5. **NV-07** (ALTA, risco baixo) — breadcrumbs, **depois** das sub-rotas: antes
   disso não haveria o que trilhar.
6. **NV-06** (ALTA, risco baixo) — rebalancear o bottom nav do admin. Precisa de
   dado de uso real para escolher quais seções promover.
7. **NV-12 / NV-16 / NV-14** (MÉDIA/BAIXA) — fork de papel, foco pós-criação e
   contador de passos.
