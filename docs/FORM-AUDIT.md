# Auditoria de Formulários — m2-auto-hub

> **Etapa de auditoria. Nenhum código foi alterado e nenhuma funcionalidade removida.**
>
> Checklist obrigatório: `docs/UI-UX-INVENTORY.md` §9 — 31 superfícies de entrada
> de dados (F1–F23 + FM1–FM8).
>
> **Método:** leitura de código e `grep` sobre `apps/frontend/src`. Toda contagem
> é reproduzível por comando. Onde o inventário afirmava algo, reverifiquei
> contra o código.
>
> Data: 17/09/2026 · Base: branch `main`

---

## 1. Resumo executivo

A afirmação central do inventário **se confirma e é mais séria do que parece**:

- `useForm` aparece em **1 arquivo** — o primitivo `ui/form.tsx`, que ninguém consome.
- `zodResolver`: **0 ocorrências**.
- `zod` importado apenas por 3 arquivos, **todos órfãos** (`schemas/`, `utils/validation.ts`, `hooks/useValidation.ts`).

Ou seja: **1.338 linhas de validação instaladas e desligadas**, enquanto 31
formulários validam à mão — quando validam.

A consequência prática é mensurável em três eixos:

| Eixo | Medição | Leitura |
|---|---|---|
| **Erro acionável** | `aria-invalid`: **0** · `role="alert"`: **0** · `aria-describedby`: **0** | O erro é puramente visual. Leitor de tela não recebe nada |
| **Erro localizado** | Só **10 de 31** formulários marcam o campo com erro. Os 3 mais densos (21, 17 e 17 campos) têm **zero** | O usuário recebe "Preencha todos os campos" e procura sozinho em 21 campos |
| **Teclado** | Nos **8 modais densos** (102 campos): `<form>` = 0, handler de Enter = 0 | Enter não submete em nenhuma das superfícies mais pesadas do sistema |

Nada disso é aparência. É a experiência de preenchimento.

**19 achados:** 4 CRÍTICA, 6 ALTA, 6 MÉDIA, 3 BAIXA.

---

## 2. Matriz de achados

### Prioridade CRÍTICA

| ID | Formulário | Rota | Arquivo | Problema | Evidência | Impacto UX | Solução proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **FA-01** | Todos (31) | todas | — | Erro de validação **não é exposto a tecnologia assistiva** | `grep aria-invalid` → **0**; `role="alert"` → **0**; `aria-describedby` → **0** (fora de `ui/`). O padrão usado é `className={errors.name ? 'border-red-500' : ''}` + `<p class="text-red-500">` ([ProductModal.tsx:676-682](apps/frontend/src/components/admin/ProductModal.tsx#L676-L682)) | Usuário de leitor de tela **não sabe que o campo falhou** nem por quê. Também afeta daltônicos: a borda vermelha é o único sinal no campo | Ligar `aria-invalid={!!errors.x}` + `aria-describedby` ao `<p>` do erro, e `role="alert"` no container. O primitivo `ui/form.tsx` já faz isso — está pronto e sem uso | **CRÍTICA** |
| **FA-02** | FM1 `CreateQuoteModal` (21 campos), FM4 `CreateOrderModal` (17), FM3 `ProductModal` (17), FM2 `PromotionModal` (18), FM5 `ServiceOrderModal` (11) | `/store-panel/*` | `admin/*Modal.tsx` | **Enter não submete** em nenhum dos 8 modais densos | `grep '<form'` nos 8 → **0**; `onKeyDown/Enter` → **0**. Submissão só por `onClick` do botão | Quebra a expectativa mais básica de formulário. Em 21 campos, obriga navegar até o rodapé com mouse | Envolver em `<form onSubmit>` com botão `type="submit"`. Mudança pequena, ganho grande | **CRÍTICA** |
| **FA-03** | F1 Contato da landing | `/` | `components/Contact.tsx` | **Nenhum campo tem label** — só placeholder | `grep '<label\|<Label\|aria-label'` → **0**, para **4 inputs** e 3 placeholders | Placeholder some ao digitar: o usuário perde a referência do que está preenchendo. Para leitor de tela, os campos são anônimos. Viola WCAG 3.3.2 | Adicionar `<label>` associado por `htmlFor`/`id` (visível ou `sr-only`) | **CRÍTICA** |
| **FA-04** | FM1, FM2, FM3, FM4, FM5 | `/store-panel/*` | modais densos | Erro reportado por **toast genérico**, sem apontar o campo | [CreateOrderModal.tsx:310-322](apps/frontend/src/components/admin/CreateOrderModal.tsx#L310-L322): `if (!customerName \|\| !customerEmail \|\| !customerPhone)` → toast *"Preencha todos os dados do cliente"*. `errors[]` nesses arquivos: CreateOrderModal **0**, CreateQuoteModal **0**, ServiceOrderModal **0** | O toast desaparece em segundos e não diz **qual** dos 3 campos falhou. Em formulário de 17–21 campos, é busca manual | Marcar o campo com erro (como `ProductModal` e `CouponModal` já fazem) e rolar até o primeiro inválido | **CRÍTICA** |

### Prioridade ALTA

| ID | Formulário | Rota | Arquivo | Problema | Evidência | Impacto UX | Solução proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **FA-05** | Todos com telefone/CPF/CEP | todas | — | **Teclado mobile errado**: campos numéricos abrem teclado alfabético | `type="tel"` em todo o projeto: **2** · `inputMode`: **2** · para **315** `<Input>`. Inconsistência dentro do mesmo arquivo: [CustomerAuthCard.tsx:160](apps/frontend/src/components/customer/CustomerAuthCard.tsx#L160) tem `type="tel"` no login, mas a linha 248 (cadastro) **não tem** | Em celular — o dispositivo dominante do cliente — digitar telefone/CPF exige trocar de teclado a cada campo | `type="tel"` + `inputMode="numeric"` nos campos de telefone, CPF, CEP e número | **ALTA** |
| **FA-06** | Todos | todas | — | **`autoComplete` praticamente ausente** | `grep autoComplete` → **4 ocorrências** para 315 inputs | Sem preenchimento automático de nome, e-mail, telefone e endereço. Custo alto em mobile e em formulários de endereço | Adicionar tokens padrão (`name`, `email`, `tel`, `postal-code`, `street-address`, `current-password`, `new-password`) | **ALTA** |
| **FA-07** | FM1–FM8 (8 modais, 102 campos) | `/store-panel/*` | `admin/*Modal.tsx` | **Perda silenciosa de dados**: fechar o modal descarta tudo sem aviso | Só **1 de 8** protege: [CreateOrderModal.tsx:470](apps/frontend/src/components/admin/CreateOrderModal.tsx#L470) usa `window.confirm`. Os outros 7 (`CreateQuoteModal`, `ProductModal`, `PromotionModal`, `ServiceOrderModal`, `CouponModal`, `ServiceModal`, `QuoteModal`): **0** | Um clique fora do modal (Radix fecha por padrão) apaga 21 campos preenchidos. Sem desfazer | Interceptar `onOpenChange` quando houver alteração e confirmar. Padronizar nos 8 — hoje até o aviso existente usa `window.confirm` nativo, fora do design system | **ALTA** |
| **FA-08** | Todos | todas | — | **Zero persistência de rascunho** | `grep localStorage` + draft/rascunho nos formulários → **0** | Perder a conexão, recarregar ou fechar a aba em um formulário de 21 campos significa recomeçar | Salvar rascunho em `localStorage` nos 5 formulários mais densos (FM1–FM5), limpando no sucesso | **ALTA** |
| **FA-09** | F9 Cadastro cliente, F6 Criar cliente | `/customer-login`, `/store-panel/clientes` | `CustomerAuthCard.tsx`, `CreateCustomerModal.tsx` | **Máscara de telefone/CPF duplicada por cópia literal** | `formatPhone` existe em **4 lugares**: [CreateCustomerModal.tsx:140](apps/frontend/src/components/admin/CreateCustomerModal.tsx#L140) e [CustomerAuthCard.tsx:55](apps/frontend/src/components/customer/CustomerAuthCard.tsx#L55) são idênticas (só mudam as aspas), mais `utils/formatters.ts` e `utils/masks.ts`. Este último tem `isValidCPF`, `isValidPhone`, `isValidCEP` prontos — e **0 consumidores** | Formatação pode divergir entre telas; a validação real de CPF existe e não é usada (aceita `111.111.111-11`) | Consolidar em um módulo único. `utils/masks.ts` já tem tudo — decidir entre adotá-lo ou migrar para `utils/formatters.ts` | **ALTA** |
| **FA-10** | FM3 `ProductModal` e uploads | `/store-panel/produtos` | `ProductImageUpload.tsx`, `ProductImageCropper.tsx` | **Erro de upload via `alert()` nativo** | 7 ocorrências: [ProductImageUpload.tsx:69,74,88](apps/frontend/src/components/admin/ProductImageUpload.tsx#L69), `ProductImageCropper.tsx:118`, `ArrayEditor.tsx:50`, `RevisionsListContent.tsx:91,105` | Caixa modal do navegador bloqueia a página, destoa do design system e não é estilizável. O resto do app usa toast | Trocar por `toast.error`, já disponível e usado em 40+ arquivos | **ALTA** |

### Prioridade MÉDIA

| ID | Formulário | Rota | Arquivo | Problema | Evidência | Impacto UX | Solução proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **FA-11** | F6/FM1/FM4 | `/store-panel/*` | `CreateOrderModal`, `CreateQuoteModal` | **Formulários equivalentes com campos divergentes** | `CreateQuoteModal` tem `customerCpf` ([linha 96](apps/frontend/src/components/admin/CreateQuoteModal.tsx#L96)); `CreateOrderModal` **não tem**. Ambos coletam nome, e-mail e telefone do mesmo cliente | O mesmo cadastro exige dados diferentes conforme a porta de entrada. Dados incompletos conforme o caminho | Definir o conjunto canônico de campos do cliente e extrair um bloco compartilhado `<CustomerFields>` | **MÉDIA** |
| **FA-12** | F7 vs F11 | admin vs cliente | `CreateVehicleModal.tsx` (488 l.) vs `CreateVehicleModalCustomer.tsx` (450 l.) | **Mesmo objeto, formulários com 12 e 4 campos** | Admin: `brand, model, year, plate, color, fuel, mileage, chassisNumber, displacement, power, city, state`. Cliente: `plate, color, mileage, chassisNumber` | Veículo cadastrado pelo cliente nasce incompleto; o admin depois precisa completar. Pode ser intencional (menos fricção), mas não está documentado | Confirmar a intenção. Se for deliberado, registrar; se não, alinhar os campos essenciais | **MÉDIA** |
| **FA-13** | F5, F10 | `/store-panel/minha-conta`, `/customer/perfil` | `AdminAccountContent.tsx`, `CustomerProfile.tsx` | **Feedback só por toast, sem erro por campo** | `AdminAccountContent`: toast=18, erro-inline=**0** (5 campos). `CustomerProfile`: toast=21, erro-inline=**0** (13 campos) | Em troca de senha, o usuário não sabe qual regra falhou sem ler o toast inteiro | Erro inline por campo, especialmente nos requisitos de senha | **MÉDIA** |
| **FA-14** | FM8 `QuoteModal` | `/store-panel/orcamentos` | `QuoteModal.tsx` | 3 campos em **537 linhas** — é majoritariamente visualização, mas com entrada embutida | Confirmado: 3 campos de entrada. O inventário levantou a dúvida (§9.3); **está confirmado** que é tela de detalhe com ações | Mistura de responsabilidades dificulta prever se o botão salva ou só fecha | Separar visualização de edição, ou rotular as ações com clareza | **MÉDIA** |
| **FA-15** | F3 Checkout | `/` (drawer) | `CheckoutDrawer.tsx` (881 l.) | **Só 3 campos** (`name`, `email`, `whatsapp`) em 881 linhas; 10 inputs para 5 labels | `grep 'id='` → 3 únicos. labels=5, inputs=10 | Metade dos inputs sem label associado, no fluxo que gera receita | Auditar campo a campo e associar labels. **Ver PENDING #2** — não consegui percorrer o fluxo por dentro sem escrever dados | **MÉDIA** |
| **FA-16** | F1 Contato | `/` | `components/Contact.tsx` | **O formulário não envia nada** — monta uma URL de WhatsApp | [Contact.tsx:33-45](apps/frontend/src/components/Contact.tsx#L33-L45): `handleSubmit` concatena os campos e abre `buildWhatsAppHref`. Não há campo de e-mail, apesar de ser um "formulário de contato" | O usuário preenche esperando envio e é jogado no WhatsApp. Sem esse caminho, não há como contatar por formulário | Deixar explícito no botão ("Enviar pelo WhatsApp") — o rótulo atual não avisa. Decidir se um envio por e-mail deve existir | **MÉDIA** |

### Prioridade BAIXA

| ID | Formulário | Rota | Arquivo | Problema | Evidência | Impacto UX | Solução proposta | Prioridade |
|---|---|---|---|---|---|---|---|---|
| **FA-17** | F16 `TicketChat` | `/customer/suporte` | `support/TicketChat.tsx` | Campo de mensagem sem label | labels=**0**, inputs=1 | Menor: contexto de chat torna a função óbvia. Ainda assim, anônimo para leitor de tela | `aria-label="Mensagem"` | **BAIXA** |
| **FA-18** | FM3 `ProductModal` | `/store-panel/produtos` | `ProductModal.tsx` | **7 abas** para 17 campos | 7 `TabsTrigger`: Básico, Imagens, Preços, Estoque, Ofertas, Detalhes, Marketplaces | Campos obrigatórios podem ficar em abas não visitadas; o usuário não vê o que falta. **Atenuante:** já existe marcador de erro por aba (`hasTabErrors`) | Manter as abas, mas destacar no rodapé quais têm pendência ao tentar salvar | **BAIXA** |
| **FA-19** | F17 `TicketRating` | `/customer/suporte` | `support/TicketRating.tsx` | Sem confirmação após enviar avaliação | toast=**0**; só `disabled={rating === 0}` | O usuário não sabe se a avaliação foi registrada | Mensagem de sucesso ao concluir | **BAIXA** |

---

## 3. O que está bom (verificado, não vira achado)

Registrado para a próxima etapa não "consertar" o que funciona.

| Verificação | Resultado |
|---|---|
| **Estados de loading no envio** | **Bem coberto.** `CreateOrderModal` (10 refs + 4 `disabled`), `CustomerAuthCard` (13 + 10), `ProductModal` (8 + 5). Botão desabilita durante o envio — sem duplo-submit |
| **Ordem das ações** | **Consistente.** Cancelar (`variant="outline"`) sempre antes da primária, em todos os modais inspecionados |
| **Rótulo contextual da primária** | Bom: `isEditing ? 'Salvar Alterações' : 'Criar Produto'` — o botão diz o que faz |
| **Cobertura de `htmlFor`** | **255 ocorrências para 315 inputs (81%)** — a maioria dos formulários do painel associa label corretamente. As falhas são pontuais (FA-03, FA-15, FA-17) |
| **Wizards multi-etapa** | `CreateOrderModal` e `CreateQuoteModal` validam **por etapa** (`validateStep`), não só no fim — decisão correta. O problema é a mensagem (FA-04), não a estrutura |
| **`NewRevisionFlow`** | 4 etapas (`StepPlate → StepCustomer → StepChecklist → StepBudget`) com agrupamento lógico coerente: identificar veículo → cliente → avaliar → orçar |
| **Agendamento cliente vs admin** | `ScheduleRevisionModal` ("Data e horário **desejados**") e `ScheduleRevisionAppointmentModal` ("Data e horário **confirmados**" + mecânico + notas internas) — **separação legítima**, papéis distintos. Não unificar |
| **Erro inline onde existe** | `ProductModal`, `CouponModal`, `ServiceModal`, `CreateVehicleModal`, `PromotionModal`, `CreateCustomerModal`, `CreateUserModal` já marcam campo com erro — o padrão correto existe e serve de modelo |
| **Progresso de upload** | `ProductImageUpload` e `ImageUploaderWithCrop` têm indicador de progresso e limite de tamanho. O problema é só o canal do erro (FA-10) |

---

## 4. Menos telas sem perder funcionalidade

O pedido inclui avaliar fluxos que poderiam ser resolvidos com menos telas.
**Minha conclusão é que há pouco a cortar** — e registro o porquê:

| Fluxo | Etapas | Avaliação |
|---|---|---|
| `NewRevisionFlow` | 4 | **Manter.** Cada etapa depende da anterior (placa → cliente → checklist → orçamento). Achatar exigiria carregar tudo de uma vez |
| `CreateOrderModal` | 4 | **Manter a estrutura**, corrigir mensagens (FA-04). A etapa de endereço é condicional (`needsAddress`) — já há economia implementada |
| `CreateQuoteModal` | 4 | Idem |
| `ProductModal` | 7 abas | **Abas ≠ etapas**: são navegação livre, não sequência forçada. Correto para edição |

A oportunidade real de redução **não é de telas, é de digitação**: FA-06
(`autoComplete`) e FA-11 (bloco de cliente compartilhado) eliminam
preenchimento repetido sem remover nenhuma funcionalidade.

---

## 5. Cobertura

### 5.1 Por superfície do inventário (§9)

| Grupo | Itens | Auditados | Estado |
|---|---|---|---|
| §9.1 com `<form>` | F1–F17 | **16/17** | F2 é página órfã sem rota → **NOT APPLICABLE** |
| §9.2 `handleSubmit` sem `<form>` | F18–F23 | **6/6** | AUDITED |
| §9.3 modais-formulário | FM1–FM8 | **8/8** | AUDITED |
| §9.4 camada de validação | 3 arquivos | **3/3** | AUDITED — confirmada desligada |
| **Total** | **31** | **30 auditados + 1 N/A** | |

Auditei as 30 superfícies vivas nos eixos: validação, mensagens de erro, estados,
ações, teclado, labels, máscaras, persistência e divergência entre equivalentes.

### 5.2 PENDING — não verificado e por quê

| # | Item | Por que | O que seria preciso |
|---|---|---|---|
| **1** | **Comportamento de submissão em execução** | Auditei por código. Não submeti formulários reais — gravaria dados no banco | Ambiente descartável ou mock da camada de API |
| **2** | **Fluxo interno do checkout (F3)** | `CheckoutDrawer` tem 881 linhas com etapas condicionais. Mapeei os campos, **não percorri os ramos** (com/sem cupom, com/sem endereço) | Percorrer o fluxo com carrinho populado |
| **3** | **Mensagens de erro vindas do backend** | Só vi o tratamento no cliente (`result.error \|\| 'fallback'`). Não sei se as mensagens do servidor são compreensíveis ao usuário final | Provocar erros reais da API e ler as respostas |
| **4** | **Responsividade dos formulários medida** | Não remedi aqui. A auditoria de responsividade cobriu as telas; **não cobriu os campos dentro dos modais** em cada largura | Medir modais abertos em 320–1920px, campo a campo |
| **5** | **Navegação por teclado completa** | Verifiquei submissão por Enter (FA-02). **Ordem de tabulação e foco após erro não foram testados** | Navegação manual por Tab ou axe-core em execução |
| **6** | **Selects nativos vs Radix** | Contei `SelectTrigger` mas não avaliei o comportamento de cada select longo (ex.: lista de mecânicos, categorias) em mobile | Inspeção por componente, em execução |
| **7** | **Contraste das mensagens de erro** | `text-red-500` sobre fundo branco não foi medido contra WCAG 1.4.3 | Verificação de contraste |

**A cobertura não é total:** 7 itens seguem `PENDING`. As 30 superfícies vivas
estão auditadas por código; o que falta exige a aplicação em execução com
escrita de dados.

---

## 6. Contagens finais

- **Superfícies inventariadas:** 31 (F1–F23 + FM1–FM8).
- **Auditadas:** **30** · **NOT APPLICABLE:** 1 (F2, órfã).
- **Achados:** **19** — 4 CRÍTICA, 6 ALTA, 6 MÉDIA, 3 BAIXA.
- **Itens PENDING:** **7**.
- **Campos totais nos modais densos:** 102 em 7.595 linhas (confirmado).
- **Linhas de validação instaladas e desligadas:** 1.338.

---

## 7. Gate

**Nenhum código foi alterado. Nenhuma funcionalidade removida.**

Ordem sugerida para a correção, por relação impacto/risco:

1. **FA-01** (CRÍTICA, risco baixo) — `aria-invalid` + `aria-describedby` + `role="alert"`. Aditivo, sem mudar layout.
2. **FA-03 / FA-17** (CRÍTICA/BAIXA, risco nulo) — labels ausentes.
3. **FA-05 / FA-06** (ALTA, risco nulo) — `type`, `inputMode` e `autoComplete`. Puramente aditivo, ganho imediato em mobile.
4. **FA-10** (ALTA, risco baixo) — trocar `alert()` por toast.
5. **FA-02** (CRÍTICA, risco médio) — envolver os 8 modais em `<form>`. Mexe em submissão; testar cada um.
6. **FA-04** (CRÍTICA, risco médio) — erro por campo nos wizards, seguindo o padrão que `ProductModal` já usa.
7. **FA-07 / FA-08** (ALTA, risco médio) — proteção ao fechar e rascunho.
8. **FA-09 / FA-11** (ALTA/MÉDIA, **decisão antes de código**) — consolidar máscaras e definir o conjunto canônico de campos do cliente.
