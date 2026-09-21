# Auditoria de Apresentação e Manipulação de Dados — m2-auto-hub

> **Etapa de auditoria. Nenhum código foi alterado.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §10 (tabelas e listas) e §11
> (navegação) — 29 listagens principais + 3 tabelas.
>
> **Método:** aplicação real rodando (`localhost:8080`), medição de DOM com
> Playwright, login real por API. Para provar o comportamento em volume, **inseri
> 200 produtos sintéticos no banco local, medi, e os removi em seguida** (banco
> restaurado aos 37 originais — verificado). Tudo marcado **[MEDIDO]** vem
> dessas medições.
>
> Data: 17/09/2026 · Base: branch `main`

---

## 1. Resumo executivo

O sistema quase não usa tabelas: as listagens são **grids de card**, decisão
acertada para responsividade. Os estados de vazio, loading e erro estão bem
cobertos — e a maioria distingue "nunca houve dado" de "o filtro não achou nada",
que é a distinção que importa.

O problema está em outro lugar, e é estrutural:

> **As listagens carregam `page: 1, limit: 100` e nunca pedem a página 2.**
> Não existe nenhum controle de paginação na aplicação. Acima de 100 registros,
> os dados excedentes ficam **inacessíveis pela interface** — e, como a busca é
> local sobre o que já foi carregado, **nem buscando se chega neles**.

Isso está provado com medição, não inferido (§3).

Somam-se dois padrões de escala: **zero seleção em massa** e **três botões por
item** em toda listagem — o que produz 111 botões numa tela de 37 produtos.

**18 achados:** 3 CRÍTICA, 5 ALTA, 6 MÉDIA, 4 BAIXA.

---

## 2. Inventário de mecanismos — o que existe e o que não existe

Levantamento por `grep` sobre `apps/frontend/src`, confirmado em execução.

| Mecanismo | Situação | Evidência |
|---|---|---|
| **Paginação** | **Inexistente na UI** | `ui/pagination.tsx` existe: **0 consumidores**. Nenhuma listagem tem controle de página |
| **Ordenação pelo usuário** | **1 de 29 listagens** | Só `CustomerFavorites` ([linha 601](apps/frontend/src/components/customer/CustomerFavorites.tsx#L601)) expõe um `<Select>` de ordenação |
| **Seleção em massa** | **Inexistente** | `checkboxes` nas listagens medidas: **0** em todas. Os hits de "selectedItems" são de wizards de pedido, não de listagem |
| **Menu de contexto por item** | **Inexistente** | `ui/context-menu.tsx`: **0** consumidores. `aria-haspopup=menu` nas listagens: **0** |
| **Virtualização** | **Inexistente** | `react-window` / `react-virtual` / `IntersectionObserver`: 0 ocorrências |
| **Busca** | Presente, mas **local** | Filtra o array já carregado (§3) |
| **Filtros** | Presentes em 15 telas | Cada tela reimplementa (ver `COMPONENT-AUDIT.md` D-02) |
| **Estados vazio/loading/erro** | **Bem cobertos** | §5 |
| **Conteúdo longo** | Tratado | 65 `truncate` + 17 `line-clamp` |

---

## 3. A evidência central — o teto de 100 [MEDIDO]

### O experimento

1. Banco local com **37 produtos** → a tela renderiza **37**.
2. Inseri **200 produtos sintéticos** (total: **237**).
3. Recarreguei `/store-panel/produtos`.

### O resultado

```
produtos no banco : 237
itens renderizados: 100      ← em 390px e em 1280px
controle de página: nenhum
aviso ao usuário  : nenhum
```

**137 produtos simplesmente não existem para quem usa o sistema.** Não há
mensagem, contador ou botão "carregar mais" — a lista termina em silêncio.

### E a busca não resgata

O produto `ZZTESTE Produto 199` **existe no banco** (confirmado por SQL). Buscando
por ele na tela:

```
busca "ZZTESTE Produto 199" -> resultados = 0
                               mensagem   = "Nenhum produto encontrado"
```

A mensagem afirma que o produto não existe. Ele existe.

### Causa raiz, confirmada no código

| Camada | Evidência |
|---|---|
| Carga | [AdminContent.tsx:234-239](apps/frontend/src/components/admin/AdminContent.tsx#L234-L239): seis chamadas `{ page: 1, limit: 100 }`. `page` é constante |
| Busca | [AdminProductsSection.tsx:106-136](apps/frontend/src/components/admin/AdminProductsSection.tsx#L106-L136): `useMemo` filtrando `products` em memória — não chama a API |
| API | `adminService` **devolve** `pagination: {page, limit, total, totalPages}`. A UI lê `totalCount` para os KPIs e **descarta `totalPages`** |

> O backend está correto e paginado. **É a interface que só pede a primeira página.**

Um único lugar no sistema pagina de verdade: [PromotionModal.tsx:295-310](apps/frontend/src/components/admin/PromotionModal.tsx#L295-L310), com laço `while` e teto de 10 páginas — o comentário no código (*"Backend limit máximo é 100, então fazer múltiplas requisições"*) mostra que o limite era conhecido, e a solução não foi generalizada.

---

## 4. Matriz de achados

### CRÍTICA

| ID | Tela/Componente | Tipo | Problema | Evidência | Impacto | Solução | Prioridade |
|---|---|---|---|---|---|---|---|
| **DV-01** | Todas as listagens do admin (14) | paginação / grandes volumes | Acima de 100 registros, os dados ficam **inacessíveis** e o usuário não é avisado | **[MEDIDO]** 237 produtos no banco → 100 renderizados, sem controle de página. `AdminContent.tsx:234-239` fixa `page: 1` | **Perda funcional**, não estética. Com o catálogo crescendo, produtos, pedidos e clientes desaparecem da gestão | Paginação real (ou scroll infinito) consumindo o `totalPages` que a API já devolve. `ui/pagination.tsx` já existe sem uso | **CRÍTICA** |
| **DV-02** | Busca de todas as listagens | busca | Busca é **local** sobre os 100 carregados e informa "não encontrado" para registros que existem | **[MEDIDO]** `ZZTESTE Produto 199` existe no banco; a busca devolve "Nenhum produto encontrado". `AdminProductsSection.tsx:106` filtra em `useMemo` | **Mensagem factualmente errada.** O operador conclui que o dado não existe e pode recadastrá-lo — gerando duplicata | Busca no servidor com debounce (o padrão já existe em `AdminUsersSection.tsx:48` e nos 3 wizards) | **CRÍTICA** |
| **DV-03** | `AdminUsersSection` (T1) | tabela / mobile | Tabela de 863px exige rolar **3,02× a largura visível** em 320px; a coluna "Ações" (180px) fica inteiramente fora | **[MEDIDO]** 320px: tabela 863px / visível 286px / rolar 577px. Em 390px: 2,42×. Só a partir de 1024px cabe | Ações do item inalcançáveis sem descobrir que a área rola na horizontal — affordance fraca em toque | Cards em mobile. **`store/withMobileCards.tsx` já implementa exatamente isso e tem 0 consumidores** (ver `COMPONENT-AUDIT.md` O-03) | **CRÍTICA** |

### ALTA

| ID | Tela/Componente | Tipo | Problema | Evidência | Impacto | Solução | Prioridade |
|---|---|---|---|---|---|---|---|
| **DV-04** | Produtos, Serviços, Cupons, Promoções, Clientes | ações por item | **Três botões de texto por item**, repetidos em toda a lista | **[MEDIDO]** `/store-panel/produtos` com 37 itens: `Desativar`×37, `Editar`×37, `Excluir`×37 = **111 botões**. Clientes (25): `Ficha PDF`×25, `Contatar`×25, `Ver Pedidos`×25 = **75** | Ruído visual e cognitivo; "Excluir" sempre a um toque de distância, sem hierarquia entre ação comum e destrutiva | Ação primária visível + demais em menu por item (`⋮`). `ui/dropdown-menu` já existe e é usado em 2 telas | **ALTA** |
| **DV-05** | Todas as listagens | seleção em massa | **Não existe seleção múltipla** em nenhuma listagem | **[MEDIDO]** checkboxes nas 15 listagens medidas: **0** | Desativar 20 produtos = 20 ciclos de clique + confirmação. Operação em lote é impossível | Checkbox por item + barra de ações em massa nas listagens de catálogo (produtos, serviços, cupons) | **ALTA** |
| **DV-06** | Todas exceto `CustomerFavorites` | ordenação | Usuário não controla a ordem; a lista vem na ordem do backend | `sortBy` exposto em **1 de 29** listagens ([CustomerFavorites.tsx:601](apps/frontend/src/components/customer/CustomerFavorites.tsx#L601)) | Sem "mais recentes", "maior preço" ou "menor estoque", achar um item vira rolagem manual | Select de ordenação nas listagens principais, idealmente no servidor (junto de DV-01) | **ALTA** |
| **DV-07** | Listagens do admin | grandes volumes / DOM | Sem virtualização: cada item renderiza a árvore completa | **[MEDIDO]** 100 produtos → **6.298 nós de DOM** (37 produtos → 2.536). Escala ~63 nós/item | Com paginação (DV-01) o problema fica contido; sem ela, listas grandes travam o dispositivo — pior em celular | Resolver DV-01 primeiro. Virtualização só se optarem por scroll infinito | **ALTA** |
| **DV-08** | `AdminContent` (dashboard, pedidos, orçamentos, clientes) | carga de dados | **Seis chamadas de 100 itens no carregamento** da tela, mesmo para abas não abertas | [AdminContent.tsx:234-239](apps/frontend/src/components/admin/AdminContent.tsx#L234-L239): orders, quotes, services, coupons, products, customers — todas em paralelo, sempre | Tempo de carga e tráfego desnecessários; em conexão móvel, custo real | Carregar por aba (lazy), ou reduzir o `limit` para o que o KPI precisa | **ALTA** |

### MÉDIA

| ID | Tela/Componente | Tipo | Problema | Evidência | Impacto | Solução | Prioridade |
|---|---|---|---|---|---|---|---|
| **DV-09** | `ServiceOrdersContent` | estado vazio | Não distingue "sem OS cadastrada" de "filtro não achou" | [ServiceOrdersContent.tsx:215](apps/frontend/src/components/admin/ServiceOrdersContent.tsx#L215): mensagem única *"Nenhuma ordem de serviço encontrada."* Compare com `AdminProductsSection.tsx:318-325`, que trata os dois casos | Usuário com filtro ativo pensa que não há dado, em vez de limpar o filtro | Seguir o padrão já usado em produtos/cupons/pedidos | **MÉDIA** |
| **DV-10** | `/customer/cupons`, `/customer/orcamentos`, `/customer/revisoes` | estado vazio | Estado vazio **sem ação** | **[MEDIDO]** CTA no vazio: pedidos → "Ver Produtos" ✅, favoritos → "Explorar Produtos" ✅, veículos → "Cadastrar Veículo" ✅; cupons, orçamentos, revisões → **nenhum** | Beco sem saída: o cliente vê "Nenhum orçamento encontrado" e não tem o que fazer ali | Adicionar CTA ("Solicitar orçamento", "Agendar revisão") | **MÉDIA** |
| **DV-11** | `AdminUsersSection` (T1) | tabela | 6 colunas fixas, sem escolha do que exibir | **[MEDIDO]** colunas em 320px: Nome 127px, Email **253px**, Cargo 111, Status 84, Criado em 109, Ações 180 | "Email" ocupa 29% da largura e empurra "Ações" para fora | Priorizar colunas por breakpoint (esconder "Criado em" e truncar e-mail abaixo de `lg`) | **MÉDIA** |
| **DV-12** | Listagens vs modais de detalhe | redundância consulta/detalhe | Card da lista e modal de detalhe repetem os mesmos campos | `OrderDetailsModal` tem ~38 blocos de label/valor; o card da lista já mostra cliente, status, total e data | Não é erro, mas o modal não acrescenta o suficiente para justificar a viagem | Enxugar o card ao essencial + ação, deixando o detalhe no modal | **MÉDIA** |
| **DV-13** | Filtros de 15 telas | filtros | Cada tela reimplementa busca + filtro, com comportamentos distintos | 15 placeholders diferentes; só `AdminUsersSection` tem debounce. Ver `COMPONENT-AUDIT.md` D-02/O-01 | Comportamento inconsistente (uma tela filtra ao digitar, outra não) | `FilterBar` compartilhado, resolvido junto de DV-02 | **MÉDIA** |
| **DV-14** | `LoyaltyManagement` (T2) | tabela | Segunda tabela do sistema, mesma exposição de DV-03 | **[MEDIDO]** a tela renderiza em todas as larguras sem overflow de página, mas contém `<table>` com o mesmo padrão | Menor que DV-03 (menos colunas), mas mesma classe de problema | Mesma solução: `withMobileCards` | **MÉDIA** |

### BAIXA

| ID | Tela/Componente | Tipo | Problema | Evidência | Impacto | Solução | Prioridade |
|---|---|---|---|---|---|---|---|
| **DV-15** | Listagens do admin | feedback de escala | Nenhuma listagem informa **quantos itens existem** | Nenhum "37 de 237" nas telas medidas; `totalCount` é lido só para KPIs | Sem noção de escala, o teto de DV-01 passa despercebido | Mostrar "exibindo X de Y" — atenua DV-01 mesmo antes da paginação | **BAIXA** |
| **DV-16** | `CustomerFavorites` | grids | 12 `.map` aninhados num só arquivo | Inventário §10.2 (o mais denso do painel do cliente) | Complexidade de manutenção | Extrair o card do favorito | **BAIXA** |
| **DV-17** | Listagens em geral | conteúdo longo | Truncamento presente, mas sem revelar o texto completo | 65 `truncate` + 17 `line-clamp`; sem `title` ou tooltip associado | Nome longo cortado sem como ler o restante sem abrir o detalhe | Adicionar `title` nos elementos truncados | **BAIXA** |
| **DV-18** | `/store-panel/suporte`, `/store-panel/ordens-de-servico` | responsividade de lista | Contagem de itens renderizados varia entre 390px e 834px | **[MEDIDO]** A11-suporte: 5 itens em 390px, 4 em 834px. Idem A4-os e A13-cupons | Provável diferença de layout (elemento extra no mobile), não perda de dado. **Não confirmado item a item** | Verificar se é um card de resumo exclusivo do mobile | **BAIXA** |

---

## 5. O que está bom (verificado — não mexer)

| Verificação | Resultado [MEDIDO] |
|---|---|
| **Grids em vez de tabelas** | Decisão acertada. Só 3 tabelas em todo o sistema; o resto são cards, que se adaptam sem rolagem horizontal |
| **Overflow horizontal nas listagens** | **Zero** em todas as telas medidas (390, 834, 1280px). A tabela T1 rola dentro do próprio container, sem vazar para a página |
| **Estados vazio / loading / erro** | Presentes em todas as 10 listagens verificadas por código |
| **Vazio distingue filtro de ausência** | Implementado em produtos, cupons, serviços e pedidos do cliente (`searchTerm \|\| statusFilter !== 'all' ? ... : ...`). Só `ServiceOrdersContent` não segue (DV-09) |
| **CTA no estado vazio** | 3 de 6 telas do cliente oferecem ação ("Ver Produtos", "Explorar Produtos", "Cadastrar Veículo") |
| **Profundidade das páginas** | 1 a 2 telas de rolagem nas listagens medidas — nenhuma lista infinita acidental |
| **Conteúdo longo** | 65 `truncate` + 17 `line-clamp`: o texto longo não quebra o layout |
| **Debounce onde existe** | `AdminUsersSection` e os 3 wizards de cliente já usam — o padrão correto existe na base |

---

## 6. Cobertura

### 6.1 Por item do inventário §10

| Grupo | Itens | Auditados | Estado |
|---|---|---|---|
| Tabelas (§10.1) | T1, T2, T3 | **2** | T1 e T2 medidas. **T3 `ProductSpecifications` → PENDING** (§6.2 #4) |
| Listagens admin | 14 | **8 medidas** + 6 por código | Medidas: produtos, clientes, usuários, fidelidade, serviços, cupons, OS, suporte |
| Listagens cliente | 8 | **7 medidas** (estado vazio) | Ver PENDING #1 — sem dados no banco |
| Listagens mecânico | 2 | **0** | **PENDING** #3 |
| Listagens públicas | 5 | **0** | **PENDING** #5 |
| Mecanismos transversais | 9 | **9** | §2 — todos verificados |

### 6.2 PENDING — não verificado e por quê

| # | Item | Por que | O que seria preciso |
|---|---|---|---|
| **1** | **Listagens do cliente com dados** | O banco tem **0 pedidos, 0 favoritos, 0 veículos** (confirmado por SQL), embora o perfil exiba "15 Pedidos". Medi o **estado vazio**, não a lista populada | Seed com dados do cliente `joao.silva` |
| **2** | **Comportamento de scroll da tabela em toque** | Medi a geometria (3,02×). **Não testei** se o gesto de arrastar funciona bem num dispositivo real | Teste em dispositivo físico ou emulação de toque |
| **3** | **Listagens do mecânico** | Foco desta rodada foi admin + cliente. A auditoria de responsividade já cobriu M1–M3 no eixo de layout | Rodar o mesmo harness com a sessão do mecânico |
| **4** | **T3 `ProductSpecifications`** | Tabela pública dentro da página de produto; exige navegar até um produto específico | Abrir a landing e um produto com especificações |
| **5** | **Listagens públicas (5)** | Produtos, serviços, promoções, depoimentos, destaques na landing | Medir `/` com o harness |
| **6** | **Volume em pedidos/clientes** | Provei o teto de 100 em **produtos**. Assumi que vale para as outras listagens por usarem a mesma chamada — **não medi cada uma** | Repetir o experimento por entidade |
| **7** | **Ordenação vinda do backend** | Sei que o usuário não controla a ordem. **Não verifiquei** qual ordenação a API aplica por padrão | Inspecionar as queries do backend |
| **8** | **DV-18 (variação 390 vs 834)** | Observei a diferença de contagem, **não confirmei** a causa item a item | Inspeção do DOM nas duas larguras |

**A cobertura não é total:** 8 itens seguem `PENDING`.

---

## 7. Contagens finais

- **Listagens inventariadas:** 29 + 3 tabelas.
- **Medidas em navegador:** **15 listagens** + 2 tabelas, em 3 larguras.
- **Achados:** **18** — 3 CRÍTICA, 5 ALTA, 6 MÉDIA, 4 BAIXA.
- **Itens PENDING:** **8**.
- **Amostras de medição:** 45 (15 telas × 3 larguras) + experimento de volume + 5 larguras da tabela.

---

## 8. Nota sobre o ambiente

Para provar DV-01 e DV-02 inseri **200 produtos sintéticos** (`sku LIKE 'ZZ-%'`)
no Postgres local, medi, e **removi todos** — o banco voltou aos 37 produtos
originais, verificado por `count(*)`. Nenhum outro dado foi tocado. Isso afetou
apenas o banco local em Docker, nunca a VPS.

---

## 9. Gate

**Nada foi implementado.**

Ordem sugerida, por relação impacto/risco:

1. **DV-15** (BAIXA, risco nulo) — mostrar "X de Y". É a menor mudança que torna
   DV-01 **visível** para quem usa, antes mesmo de corrigi-lo.
2. **DV-09 / DV-10** (MÉDIA, risco baixo) — estados vazios.
3. **DV-03 / DV-14** (CRÍTICA/MÉDIA, risco baixo) — adotar `withMobileCards`, que
   já existe pronto.
4. **DV-01 + DV-02** (CRÍTICA, **risco alto**) — paginação e busca no servidor.
   São o mesmo trabalho e devem ser feitos juntos: paginar sem mover a busca para
   o servidor **agrava** o problema, porque a busca passaria a ver só a página
   atual.
5. **DV-04 / DV-05** (ALTA, risco médio) — menu por item e seleção em massa,
   depois que a paginação estabilizar a lista.
6. **DV-06 / DV-08** (ALTA, risco médio) — ordenação e carga por aba.
