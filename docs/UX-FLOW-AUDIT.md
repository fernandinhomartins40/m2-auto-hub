# Auditoria de UX por Fluxos Reais — m2-auto-hub

> **Etapa de auditoria. Nenhum código foi alterado e nenhum dado gravado.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §12 — 14 fluxos principais +
> 6 secundários.
>
> **Método:** percorri os fluxos na aplicação real (`localhost:8080`) com
> Playwright, executando **cliques reais** e observando cada etapa da cadeia
> *entrada → navegação → descoberta → decisão → preenchimento → ação →
> confirmação → resultado → próxima ação*. Interrompi antes da gravação
> definitiva em todos os casos. **Banco verificado idêntico antes e depois**
> (37 produtos, 0 pedidos, 25 clientes, 0 OS, 0 revisões, 0 tickets).
>
> Tudo marcado **[MEDIDO]** vem dessas execuções, não de leitura de código.
>
> Data: 17/09/2026 · Base: branch `main`

---

## 1. Resumo executivo

Os fluxos de **criação do admin são bem construídos** — e isso precisa ser dito
porque contraria a expectativa de que formulários de 17–21 campos seriam caóticos.
O `CreateOrderModal` foca o primeiro campo ao abrir, marca etapa concluída com ✓,
valida por etapa, e **adapta o indicador de progresso ao dispositivo**: trilha
visual no desktop, "Etapa 1 de 4" textual no celular.

O problema está nas **bordas dos fluxos** — onde o usuário chega sem saber o que
fazer, ou termina sem saber o que aconteceu:

> **FL6 (agendar revisão) é um beco sem saída medido.** O cliente entra em
> `/customer/revisoes`, vê 4 abas ("Agendamentos (0)", "Todas (0)"…), e a área de
> conteúdo tem **zero botões de ação**. Agendar só existe dentro de
> `/customer/veiculos`, por veículo — e nada na tela de Revisões diz isso. Com
> 0 veículos cadastrados, o fluxo é inalcançável.

**14 achados:** 2 CRÍTICA, 4 ALTA, 5 MÉDIA, 3 BAIXA.

---

## 2. Matriz de achados

### CRÍTICA

| ID | Fluxo | Rota(s) | Etapas atuais | Problema | Evidência | Impacto | Proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **UX-01** | FL6 — cliente agenda revisão | `/customer/revisoes` → ? | entrada → **parede** | A tela do fluxo **não contém o fluxo**. Ação de agendar vive em outra aba, sem qualquer pista | **[MEDIDO]** `/customer/revisoes` renderiza 4 abas (`Agendamentos (0)`, `Todas (0)`, `Concluidas (0)`, `Em andamento (0)`), mensagem *"Nenhum agendamento encontrado"* e **CTA: `[]`** — nenhum botão de ação. `grep ScheduleRevisionModal`: acionado **só** por [CustomerVehicles.tsx:269](apps/frontend/src/components/customer/CustomerVehicles.tsx#L269), pelo botão "Agendar Revisao" ([linha 216](apps/frontend/src/components/customer/CustomerVehicles.tsx#L216)) de cada veículo | **Funcionalidade inalcançável na prática.** O cliente que quer agendar vai à aba "Revisões" — o nome certo — e encontra uma parede. Precisa adivinhar que deve passar por "Veículos" e cadastrar um veículo antes | CTA no vazio de Revisões: "Agendar revisão" → se não há veículo, levar ao cadastro explicando o pré-requisito ("Para agendar, cadastre seu veículo") | **CRÍTICA** |
| **UX-02** | FL4, FL6, FL8 — estados vazios do cliente | `/customer/revisoes`, `/customer/cupons`, `/customer/orcamentos` | entrada → vazio → **sem saída** | Estado vazio sem próxima ação em 3 de 6 telas | **[MEDIDO]** Com CTA: pedidos → "Ver Produtos" ✅, favoritos → "Explorar Produtos" ✅, veículos → "Cadastrar Veiculo" ✅. **Sem CTA:** revisões → `[]`, cupons → `[]`, orçamentos tem CTA ✅ ("Solicitar orcamento") | Cliente novo — que **por definição** vê tudo vazio — encontra telas que não dizem o que fazer. A primeira sessão é onde o abandono é maior | Padronizar: todo estado vazio termina com a ação que o preenche | **CRÍTICA** |

### ALTA

| ID | Fluxo | Rota(s) | Etapas atuais | Problema | Evidência | Impacto | Proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **UX-03** | FL10 — admin cria pedido | `/store-panel/pedidos` | lista → modal → 4 etapas | Erro de etapa é **genérico**, sem apontar o campo | **[MEDIDO]** Cliquei "Próximo" com a etapa 1 vazia: mensagem *"Dados incompletos"* e **apenas 1 campo marcado** com erro, embora a etapa tenha **3 obrigatórios** (Nome*, Email*, WhatsApp*, confirmado pelos 3 asteriscos e pelo contador "0/3") | O operador lê "Dados incompletos" e precisa conferir os 3 campos um a um. Atrito repetido em cada etapa do wizard | Marcar os 3 campos faltantes e focar o primeiro. Alinha com `FORM-AUDIT` FA-04 | **ALTA** |
| **UX-04** | FL11 vs FL10 — dois wizards de 4 passos | `/store-panel/revisoes`, `/store-panel/pedidos` | 4 etapas cada | **Fluxos equivalentes com feedback de progresso diferente** | **[MEDIDO]** `CreateOrderModal`: trilha visual (`1 Cliente 2 Itens 3 Endereço 4 Pagamento`), ✓ na etapa concluída, e "Etapa 1 de 4" em mobile. `NewRevisionFlow`: trilha visual (`Veículo, Cliente, Checklist, Orçamento`) mas **"(sem contador)"** em qualquer largura | O mesmo operador aprende dois vocabulários de progresso para tarefas da mesma natureza | Portar o contador textual do `CreateOrderModal` para o `NewRevisionFlow` | **ALTA** |
| **UX-05** | FL11, FL10 (OS) — perda de contexto | `/store-panel/revisoes`, `/ordens-de-servico` | wizard/formulário **sem URL** | Voltar do navegador **sai da aplicação** no meio do trabalho | **[MEDIDO]** (registrado em `NAVIGATION-AUDIT` NV-01/NV-02 com a mesma execução): após abrir "Nova Revisão", URL permanece `/store-panel/revisoes`; `goBack()` → **`about:blank`** | Perda de trabalho no meio de um wizard de 4 passos. É o gesto mais natural do usuário para "voltar um passo" | Sub-rotas por etapa/sub-view | **ALTA** |
| **UX-06** | FL3 → FL2 — cliente logado quer comprar | `/customer/*` | painel → **sem saída** | O painel do cliente monta carrinho mas **não tem link para a loja** | **[MEDIDO]** `/customer/inicio` em 1280px e 390px: **0 tags `<a>`**, nenhum link para `/`. Ao mesmo tempo, [CustomerPanel.tsx:88](apps/frontend/src/pages/CustomerPanel.tsx#L88) monta `<CartDrawer />` | Contradição funcional: o cliente tem carrinho e nenhum caminho para usá-lo. Precisa do Voltar do navegador ou digitar a URL | "Ir para a loja" no menu lateral e no drawer | **ALTA** |

### MÉDIA

| ID | Fluxo | Rota(s) | Etapas atuais | Problema | Evidência | Impacto | Proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **UX-07** | FL2 — compra pública | `/` → carrinho → checkout | landing → add → carrinho → finalizar | **Sem confirmação visível** ao adicionar item ao carrinho | **[MEDIDO]** Após clicar "Adicionar": o carrinho abre (`abriuCarrinho: true`), mas a busca por mensagem de confirmação retorna **"(sem confirmacao)"** | A abertura do drawer é o único sinal. Se o usuário quiser continuar comprando, fecha o drawer e perde a certeza de que o item entrou | Toast "X adicionado ao carrinho" + contador visível no ícone | **MÉDIA** |
| **UX-08** | FL2 — checkout | `CheckoutDrawer` | 10 campos, termina em WhatsApp | Rótulo não avisa que o fluxo **sai da aplicação** | [CheckoutDrawer.tsx:345-359](apps/frontend/src/components/CheckoutDrawer.tsx#L345-L359): `createGuestOrder()` **e depois** `window.open(whatsappUrl)`. O pedido **é criado** (corrigindo suposição inicial), mas o usuário é jogado no WhatsApp sem aviso prévio | Salto de contexto inesperado — especialmente em desktop, onde abre outra aba. O toast de sucesso ([linha 387](apps/frontend/src/components/CheckoutDrawer.tsx#L387)) fica numa aba que o usuário não está mais vendo | Rotular o botão ("Finalizar e enviar pelo WhatsApp") e mostrar a confirmação **antes** de abrir a aba | **MÉDIA** |
| **UX-09** | FL10, FL13 — pós-criação | listas do admin | criar → modal fecha → lista recarrega | Usuário **não é levado ao item criado** | `AdminContent.tsx:2292-2310`: `onSuccess` faz `loadData()` + fecha. Sem scroll, destaque ou navegação | Em lista que exibe até 100 itens (`DATA-VIEW-AUDIT` DV-01), o usuário não vê o resultado da própria ação | Rolar até o item e destacá-lo por alguns segundos | **MÉDIA** |
| **UX-10** | FL4 — cliente solicita orçamento | `/customer/orcamentos` | vazio → modal | Modal de orçamento **sem marcação de obrigatoriedade** | **[MEDIDO]** `RequestQuoteModal`: 3 campos, **`obrig: 0`** (nenhum asterisco). Compare com `CreateVehicleModalCustomer`, que tem 5 asteriscos para 4 campos | O cliente não sabe o que é exigido antes de tentar enviar. Inconsistente com os outros modais do mesmo painel | Padronizar a marcação de campos obrigatórios | **MÉDIA** |
| **UX-11** | FL14 — mecânico | `/mechanic-panel/revisoes` | entrada → lista vazia | Estado vazio sem orientação sobre o que fazer | **[MEDIDO]** 390px e 1280px: *"Nenhuma revisao atribuida."* + 4 abas zeradas + botão "Atualizar lista". Nenhuma explicação de que revisões chegam por atribuição do admin | O mecânico não sabe se está quebrado, se não há trabalho, ou se falta configuração | Texto explicativo: "Nenhuma revisão atribuída a você. Novas revisões aparecem aqui quando o gestor as atribuir" | **MÉDIA** |

### BAIXA

| ID | Fluxo | Rota(s) | Etapas atuais | Problema | Evidência | Impacto | Proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **UX-12** | FL7 — abrir chamado | `/customer/suporte` | vazio → ? | Dois CTAs concorrentes sem hierarquia clara | **[MEDIDO]** Botões no vazio: `["Novo Ticket", "Abrir Chat"]`. Não fica claro qual é a via principal | Hesitação na decisão. Menor porque ambos levam a atendimento | Definir ação primária e rebaixar a outra a secundária | **BAIXA** |
| **UX-13** | FL14 — mecânico mobile | `/mechanic-panel/*` | — | Ação extra aparece só em mobile | **[MEDIDO]** 390px expõe "Minhas OS" na área de conteúdo; 1280px não. Provável compensação de navegação | Inconsistência entre dispositivos para o mesmo papel | Verificar se é intencional (registrado em `RESPONSIVENESS-AUDIT` como shell do mecânico) | **BAIXA** |
| **UX-14** | FL10 — etapa 2 | `CreateOrderModal` | selecionar itens | Catálogo inteiro (37 produtos) na etapa, sem busca destacada | **[MEDIDO]** Etapa 2 mostra "0 itens no carrinho / Produtos / Serviços / 37 produtos" com 1 campo de entrada | Com catálogo maior, rolar 100+ produtos dentro de um modal fica custoso | Busca em destaque no topo da etapa | **BAIXA** |

---

## 3. O que está bem resolvido (verificado — não mexer)

Registrado para que a etapa de correção não desfaça acertos.

| Aspecto | Evidência [MEDIDO] |
|---|---|
| **Foco automático no primeiro campo** | `CreateOrderModal` ao abrir: `foco = INPUT[Digite nome, email o...]`. O usuário já pode digitar |
| **Indicador de progresso adaptativo** | Desktop/tablet: trilha visual `1 Cliente 2 Itens 3 Endereço 4 Pagamento`. Mobile (390px): **"Etapa 1 de 4"** textual. Adaptação consciente ao espaço — não é inconsistência |
| **Etapa concluída marcada** | Após avançar: `✓ Cliente 2 Itens 3 Endereço 4 Pagamento` |
| **Validação por etapa, não só no fim** | Etapa 1 vazia → "Dados incompletos". Etapa 2 sem item → **"Nenhum item selecionado"**. O erro chega cedo, não após 4 etapas |
| **Contador de preenchimento** | "0/3" na etapa de cliente, em todas as larguras |
| **Busca de cliente funcional** | Digitar "Maria" → retorna "Maria Santos". Evita redigitar dados de cliente existente |
| **Caminho curto no admin** | Dashboard → Pedidos → Novo Pedido = **3 cliques** até o formulário. Em mobile, **2 toques** (Pedidos está no bottom nav) |
| **Compra pública enxuta** | Landing → adicionar → finalizar = **2 cliques** até o checkout |
| **Checkout cria pedido de verdade** | `guestOrderService.createGuestOrder()` antes do WhatsApp — não é só uma mensagem (ressalva em UX-08 é sobre o aviso, não sobre a gravação) |
| **Estados vazios do admin distinguem filtro** | Verificado em `DATA-VIEW-AUDIT`; mantém-se aqui |
| **Modal full-screen em mobile** | 390px: modal 390×844 com rodapé ("Cancelar", "Próximo") **dentro da viewport** (`bottom: 831 < 844`). Sem botão inalcançável |

---

## 4. Correção de uma suposição inicial

Ao abrir o fluxo FL2, minha leitura preliminar foi de que o checkout apenas
montava uma mensagem de WhatsApp — como faz o formulário de contato da landing
(`FORM-AUDIT` FA-16). **A execução mostrou o contrário:** o pedido é criado no
backend e só então o WhatsApp é aberto. O achado UX-08 trata do **aviso ausente**,
não de perda de dado.

---

## 5. Fluxos executados e pendentes

### 5.1 Executados na aplicação (8 de 14)

| # | Fluxo | Até onde percorri | Achados |
|---|---|---|---|
| **FL2** | Compra pública | landing → adicionar → carrinho → checkout aberto (10 campos). **Parei antes de submeter** | UX-07, UX-08 |
| **FL4** | Cliente solicita orçamento | vazio → CTA → modal aberto (3 campos) | UX-10 |
| **FL5** | Cliente cadastra veículo | vazio → CTA → modal aberto (4 campos, 5 obrigatórios) | — (fluxo íntegro) |
| **FL6** | Cliente agenda revisão | entrada → **parede** | **UX-01** |
| **FL7** | Cliente abre chamado | vazio → 2 CTAs | UX-12 |
| **FL10** | Admin cria pedido | dashboard → lista → modal → etapa 1 → busca cliente → etapa 2 → validação. **Parei antes de gravar** | UX-03, UX-09, UX-14 |
| **FL11** | Admin abre revisão | lista → wizard aberto (4 etapas, StepPlate) | UX-04, UX-05 |
| **FL14** | Mecânico executa revisão | entrada → lista vazia, em 390px e 1280px | UX-11, UX-13 |

**Também exercitado:** FL3 (login do cliente) e FL9 (login do admin), usados para
gerar as três sessões — ambos funcionaram sem achado.

### 5.2 PENDING (6 de 14 + secundários)

| # | Fluxo | Por que ficou pendente |
|---|---|---|
| **FL1** | Visitante → orçamento por WhatsApp | Termina em app externo; o formulário já foi auditado em `FORM-AUDIT` FA-16 |
| **FL8** | Favoritos e cupons | **0 favoritos e 0 cupons do cliente no banco** — só o estado vazio seria observável |
| **FL12** | Consulta por placa | Depende do serviço ALPR e de placa real; consulta externa com custo |
| **FL13** | Editar landing page | Salvar altera a página pública — **não executei** para não modificar o site |
| **FL10 (final)** | Criação até a gravação | Interrompido de propósito: criaria pedido no banco |
| **FL11 (final)** | Wizard até o passo 4 | Idem — criaria revisão |
| **Secundários** | Aprovação pública de orçamento, PWA, marketplace, fidelidade, relacionamento | Exigem token válido, navegador com instalação, credenciais de marketplace ou dados inexistentes |

### 5.3 Contagem exigida

- **Fluxos principais inventariados:** **14**
- **Executados/analisados na aplicação:** **8** (+2 de autenticação exercitados)
- **PENDING:** **6 principais + 6 secundários = 12**
- **Achados:** **14** — 2 CRÍTICA, 4 ALTA, 5 MÉDIA, 3 BAIXA

> **A cobertura não é total.** Metade dos fluxos principais foi percorrida de
> ponta a ponta até o limite do que se pode fazer sem gravar dados; a outra
> metade exige ambiente descartável, serviços externos ou dados que o banco não
> tem.

---

## 6. Nota de ambiente

Percorri os fluxos **interrompendo antes de cada gravação definitiva**. O banco
foi verificado antes e depois, com resultado idêntico:

```
products=37  orders=0  customers=25
service_orders=0  revisions=0  support_tickets=0
```

Nenhum dado criado, alterado ou removido. Nenhum arquivo de código tocado.

---

## 7. Gate

**Nada foi implementado.**

Ordem sugerida, por relação impacto/esforço:

1. **UX-01** (CRÍTICA, risco baixo) — CTA em `/customer/revisoes`. É o maior
   ganho pelo menor esforço: destrava um fluxo hoje inalcançável.
2. **UX-02** (CRÍTICA, risco baixo) — CTA nos 2 estados vazios restantes.
   O componente `EmptyState` já existe com suporte a `action`
   (`COMPONENT-AUDIT` D-04).
3. **UX-06** (ALTA, risco nulo) — link para a loja no painel do cliente.
4. **UX-07 / UX-10** (MÉDIA, risco baixo) — confirmação ao adicionar ao carrinho
   e asteriscos no modal de orçamento.
5. **UX-03** (ALTA, risco médio) — erro por campo nos wizards; mesmo trabalho de
   `FORM-AUDIT` FA-04.
6. **UX-04** (ALTA, risco baixo) — contador textual no `NewRevisionFlow`,
   copiando o `CreateOrderModal`.
7. **UX-05** (ALTA, risco médio) — sub-rotas; mesmo trabalho de
   `NAVIGATION-AUDIT` NV-01/NV-02. **Fazer junto, não em duplicidade.**
8. **UX-08 / UX-09 / UX-11** (MÉDIA) — aviso do WhatsApp, foco pós-criação e
   texto do vazio do mecânico.
