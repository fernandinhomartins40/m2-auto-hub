# Plano de Implementação — Sistema de Ordens de Serviço (OS)

> **Objetivo:** Adicionar um sistema interno de **Ordens de Serviço** paralelo ao de Revisões, para gerenciar serviços executados e produtos usados, com atribuição de mecânico. Disponível no **painel Admin** (gestão completa) e no **painel do Mecânico** (execução).
>
> **Princípios:** reaproveitar ao máximo os padrões já existentes (Revisões), manter simples, priorizar UX/UI. Nada de complexidade desnecessária.

- **Data:** 2026-07-01
- **Stack:** `apps/backend` (Express + Prisma/PostgreSQL) · `apps/frontend` (React + Vite)

---

## Decisões de escopo (confirmadas)

1. **Cliente/veículo:** OS aceita **cadastrado OU avulso** (dados digitados na hora). Flexível para o balcão.
2. **Financeiro/estoque:** OS soma **serviços + produtos**, mostra **total**, e ao **concluir dá baixa no estoque** dos produtos usados.
3. **Atribuição:** igual às Revisões — **Admin/Manager** atribui/transfere o mecânico; o **Mecânico (STAFF)** vê e executa "Minhas OS".

---

## 1. Como o sistema atual funciona (base para reaproveitar)

- **Mecânico = `Admin` com role `STAFF`.** O painel de oficina ([MechanicPanel](../apps/frontend/src/components/mechanic/MechanicPanel.tsx)) é protegido por `admin.role === 'STAFF'` ([ProtectedMechanicRoute](../apps/frontend/src/components/mechanic/ProtectedMechanicRoute.tsx)).
- **Revisões** ([schema.prisma:905](../apps/backend/prisma/schema.prisma#L905)) já têm o padrão exato que a OS precisa: `status`, `assignedMechanicId` (→ `Admin`), `mechanicName` (cache), `assignedAt`, `transferHistory`, timestamps `completedAt`.
- **Atribuição** ([revisions.routes.ts:37](../apps/backend/src/modules/revisions/revisions.routes.ts#L37)): `assign-mechanic` / `transfer-mechanic` / `unassign-mechanic` restritos a `MANAGER+`, com `AuditLogMiddleware`.
- **OrderItem** ([schema.prisma:521](../apps/backend/prisma/schema.prisma#L521)) já modela item de produto/serviço com `type` (`OrderItemType`), `price`, `quantity`, `subtotal` — vamos espelhar esse desenho para os itens da OS.
- **Produtos** têm `stock` e `updateStock` ([products.service.ts](../apps/backend/src/modules/products/products.service.ts)) — reusaremos para a baixa de estoque.
- **Módulo padrão:** `routes → controller → service → dto`. **UI padrão:** seções em Tabs, `AdminPageHeader`, `Card`, `Badge`, modais, `useToast`.

> **Conclusão:** a OS é praticamente uma "Revisão + itens financeiros + baixa de estoque". Reusamos ~80% dos padrões.

---

## 2. Modelo de dados (Prisma)

Nova migration `add_service_orders`. Três models + dois enums.

```prisma
enum ServiceOrderStatus {
  OPEN         // aberta, aguardando execução
  IN_PROGRESS  // mecânico executando
  COMPLETED    // concluída (baixa de estoque aplicada)
  CANCELLED    // cancelada
}

enum ServiceOrderItemType {
  SERVICE      // mão de obra / serviço
  PRODUCT      // peça/produto usado
}

// Ordem de Serviço
model ServiceOrder {
  id            String             @id @default(uuid())
  number        Int                @unique @default(autoincrement()) // OS #1001, #1002...
  status        ServiceOrderStatus @default(OPEN)

  // Cliente/veículo — cadastrado (FK opcional) OU avulso (texto)
  customerId    String?
  vehicleId     String?
  customerName  String   // sempre preenchido (cache do cadastro ou avulso)
  customerPhone String?
  vehicleLabel  String?  // ex.: "Gol 2018 - ABC1D23" (cache ou avulso)
  vehiclePlate  String?
  mileage       Int?

  // Descrição do problema/serviço
  description   String?  @db.Text
  internalNotes String?  @db.Text // observações internas da oficina

  // Mecânico responsável (mesmo padrão de Revision)
  assignedMechanicId String?
  mechanicName       String?
  assignedAt         DateTime?

  // Valores (denormalizados para performance/histórico)
  laborTotal    Decimal @default(0) @db.Decimal(10, 2) // soma dos serviços
  partsTotal    Decimal @default(0) @db.Decimal(10, 2) // soma dos produtos
  discount      Decimal @default(0) @db.Decimal(10, 2)
  total         Decimal @default(0) @db.Decimal(10, 2)

  stockApplied  Boolean @default(false) // trava idempotente da baixa de estoque

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  cancelledAt DateTime?

  // Relations
  customer         Customer?          @relation(fields: [customerId], references: [id])
  vehicle          CustomerVehicle?   @relation(fields: [vehicleId], references: [id])
  assignedMechanic Admin?             @relation(fields: [assignedMechanicId], references: [id])
  items            ServiceOrderItem[]

  @@index([status])
  @@index([assignedMechanicId])
  @@index([customerId])
  @@index([createdAt])
  @@map("service_orders")
}

// Item da OS (serviço ou produto)
model ServiceOrderItem {
  id             String               @id @default(uuid())
  serviceOrderId String
  type           ServiceOrderItemType

  // Referência opcional ao catálogo (mantém histórico mesmo se o catálogo mudar)
  productId      String?
  serviceId      String?

  name           String   // nome no momento (cache)
  unitPrice      Decimal  @db.Decimal(10, 2)
  quantity       Int      @default(1)
  subtotal       Decimal  @db.Decimal(10, 2)

  createdAt      DateTime @default(now())

  serviceOrder   ServiceOrder @relation(fields: [serviceOrderId], references: [id], onDelete: Cascade)
  product        Product?     @relation(fields: [productId], references: [id])
  service        Service?     @relation(fields: [serviceId], references: [id])

  @@index([serviceOrderId])
  @@index([productId])
  @@map("service_order_items")
}
```

**Relações reversas a adicionar** (mínimas):
- `Admin`: `assignedServiceOrders ServiceOrder[]`
- `Customer`: `serviceOrders ServiceOrder[]`
- `CustomerVehicle`: `serviceOrders ServiceOrder[]`
- `Product`: `serviceOrderItems ServiceOrderItem[]`
- `Service`: `serviceOrderItems ServiceOrderItem[]`

> **Nota de simplicidade:** o `number` autoincrement dá um identificador humano ("OS #1042"). `stockApplied` garante que a baixa de estoque nunca acontece duas vezes (idempotência).

---

## 3. Backend — módulo `service-orders`

Estrutura (padrão dos módulos existentes):

```
apps/backend/src/modules/service-orders/
├── service-orders.routes.ts
├── service-orders.controller.ts
├── service-orders.service.ts
└── dto/
    ├── create-service-order.dto.ts
    ├── update-service-order.dto.ts
    └── query-service-orders.dto.ts
```

### Regras de negócio (no service)
- **Cálculo de totais:** ao criar/editar itens, recalcula `laborTotal` (soma SERVICE), `partsTotal` (soma PRODUCT), `total = labor + parts - discount`. Sempre no backend (fonte da verdade).
- **Baixa de estoque:** só ao **concluir** (`complete`), dentro de uma transação: para cada item PRODUCT com `productId`, `stock -= quantity`; marca `stockApplied = true`. Se `stockApplied` já for true, não repete.
- **Estoque insuficiente:** ao concluir, se algum produto não tiver estoque, retorna erro claro listando o item (não conclui). Simples e seguro.
- **Cancelar:** se estava COMPLETED e tinha `stockApplied`, **estorna** o estoque (devolve quantidades). Mantém consistência.
- **Atribuição:** replica `assign/transfer/unassign` das Revisões (grava `mechanicName` cache + `assignedAt`).

### Rotas

```
# Leitura (STAFF+)
GET    /service-orders                    # lista com filtros (status, mecânico, busca)
GET    /service-orders/statistics         # contadores p/ dashboard
GET    /service-orders/mechanic/:id       # OS de um mecânico
GET    /service-orders/:id                # detalhe com itens

# Criação/edição (STAFF+ cria e edita; mecânico edita as suas)
POST   /service-orders                    # cria OS (+ itens iniciais)
PUT    /service-orders/:id                # edita dados/itens
PATCH  /service-orders/:id/start          # OPEN -> IN_PROGRESS
PATCH  /service-orders/:id/complete       # -> COMPLETED (+ baixa estoque)
PATCH  /service-orders/:id/cancel         # -> CANCELLED (MANAGER+, estorna estoque)

# Itens (atalhos convenientes)
POST   /service-orders/:id/items          # adiciona item
DELETE /service-orders/:id/items/:itemId  # remove item

# Atribuição de mecânico (MANAGER+, com AuditLog — igual Revisões)
POST   /service-orders/:id/assign-mechanic
POST   /service-orders/:id/transfer-mechanic
DELETE /service-orders/:id/unassign-mechanic

# Exclusão (ADMIN+)
DELETE /service-orders/:id

# PDF (STAFF+) — reusa o padrão de export existente
POST   /service-orders/:id/export-pdf
```

Registrar em [app.ts](../apps/backend/src/app.ts): `app.use('/service-orders', serviceOrdersRoutes);`

---

## 4. Frontend — Painel Admin

### 4.1 Navegação
Adicionar item na seção **Operação** de [adminNavigation.ts](../apps/frontend/src/components/admin/adminNavigation.ts):
```ts
{ id: "service-orders", label: "Ordens de Serviço", icon: ClipboardList, section: "Operação" },
```
E `case 'service-orders'` em [AdminContent.tsx](../apps/frontend/src/components/admin/AdminContent.tsx).

### 4.2 Componentes
```
apps/frontend/src/components/admin/
├── ServiceOrdersContent.tsx      # lista + filtros + cards de status
├── ServiceOrderModal.tsx         # criar/editar OS (form completo)
└── ServiceOrderDetailsModal.tsx  # visualizar OS + concluir/atribuir
apps/frontend/src/api/
└── serviceOrderService.ts        # client (padrão apiClient)
```

### 4.3 UX da tela de OS (lista)
- **Header** com botão "Nova OS".
- **Cards de resumo:** Abertas · Em andamento · Concluídas hoje · Total.
- **Filtros:** busca (nº/cliente/placa), status, mecânico.
- **Card de OS:** nº, status (badge colorido), cliente + veículo, mecânico atribuído, total. Ações rápidas: Ver, Editar, Concluir.

### 4.4 UX do ServiceOrderModal (criar/editar) — o coração
Layout simples em blocos verticais (sem tabs, evitando complexidade):

```
┌─ Nova Ordem de Serviço ────────────────────────────┐
│ CLIENTE                                             │
│  ( ) Cliente cadastrado  [busca autocomplete]       │
│  (•) Avulso  → Nome [____]  Telefone [____]         │
│                                                     │
│ VEÍCULO                                             │
│  ( ) Do cliente [select]  (•) Avulso: Placa/Modelo  │
│  KM atual [______]                                  │
│                                                     │
│ DESCRIÇÃO DO SERVIÇO  [textarea]                    │
│                                                     │
│ ITENS ─────────────────────────────────────────────│
│  [+ Serviço]  [+ Produto]                           │
│  🔧 Troca de óleo          1x  R$120,00   [x]       │
│  📦 Óleo 5W30              4x  R$ 40,00   [x]       │
│                                                     │
│  Mão de obra: R$120  Produtos: R$160               │
│  Desconto [___]      TOTAL: R$ 280,00              │
│                                                     │
│ MECÂNICO [select opcional]                          │
│                             [Cancelar] [Salvar OS]  │
└─────────────────────────────────────────────────────┘
```

- **[+ Serviço]/[+ Produto]** abrem um seletor com autocomplete do catálogo (reusa `serviceService`/`productService`). Ao escolher, preenche nome+preço automaticamente; quantidade editável. Também permite item manual (nome+preço digitados).
- **Total recalculado ao vivo** no front (confirmado no back ao salvar).
- Produtos mostram aviso se quantidade > estoque disponível (não bloqueia salvar, só ao concluir).

### 4.5 ServiceOrderDetailsModal
- Mostra tudo somente-leitura + botões conforme status/role: **Iniciar**, **Concluir** (com confirmação da baixa de estoque), **Atribuir/Transferir mecânico** (MANAGER+), **Cancelar**, **Exportar PDF**.

---

## 5. Frontend — Painel do Mecânico

### 5.1 Navegação
Adicionar em [MechanicSidebar.tsx](../apps/frontend/src/components/mechanic/MechanicSidebar.tsx):
```ts
{ id: "service-orders", label: "Minhas OS", icon: ClipboardList },
```
E o case em [MechanicContent.tsx](../apps/frontend/src/components/mechanic/MechanicContent.tsx).

### 5.2 Componente `MechanicServiceOrdersView.tsx`
Espelha [MechanicRevisionsView](../apps/frontend/src/components/mechanic/MechanicRevisionsView.tsx):
- Lista **apenas as OS atribuídas ao mecânico logado** (filtra por `assignedMechanicId`).
- Cards com status; ações: **Iniciar**, adicionar itens (produtos usados durante o serviço), **Concluir**.
- Reusa `ServiceOrderModal`/`ServiceOrderDetailsModal` (mesmo componente, botões condicionados à role) → evita duplicação de UI.

> **UX chave:** o mecânico, ao executar, adiciona os produtos que realmente usou e conclui. A baixa de estoque acontece nesse "Concluir".

---

## 6. Permissões (resumo)

| Ação | STAFF (mecânico) | MANAGER+ |
|---|---|---|
| Ver OS | ✅ (as atribuídas) | ✅ (todas) |
| Criar/editar OS | ✅ | ✅ |
| Iniciar/Concluir | ✅ (as suas) | ✅ |
| Adicionar/remover itens | ✅ | ✅ |
| Atribuir/transferir mecânico | ❌ | ✅ (com AuditLog) |
| Cancelar OS | ❌ | ✅ |
| Excluir OS | ❌ | ADMIN+ |

---

## 7. Roadmap de implementação (incremental)

| Fase | Entregável |
|---|---|
| **1. Dados** | Migration (models + enums + relações), `prisma generate` |
| **2. Backend core** | Módulo service-orders: CRUD, cálculo de totais, itens |
| **3. Backend fluxo** | start/complete (baixa estoque) / cancel (estorno) / assign-mechanic + rotas |
| **4. Admin UI** | serviceOrderService, navegação, ServiceOrdersContent, ServiceOrderModal, DetailsModal |
| **5. Mecânico UI** | MechanicServiceOrdersView + navegação no painel oficina |
| **6. Extras** | Estatísticas no dashboard, export PDF, notificação ao atribuir mecânico |

---

## 8. O que NÃO faremos (para manter simples)

- ❌ Sem agendamento/calendário (a OS é criada quando o carro chega; agendamento já existe nas Revisões).
- ❌ Sem checklist estruturado (isso é das Revisões; a OS usa descrição livre + itens).
- ❌ Sem integração de pagamento/emissão fiscal nesta fase (só total interno).
- ❌ Sem portal do cliente para OS nesta fase (é sistema **interno**).

> Se algum desses for necessário depois, o modelo já comporta a evolução sem retrabalho.

---

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Baixa de estoque duplicada | Flag `stockApplied` idempotente + transação |
| Concluir sem estoque | Valida antes; erro claro listando o item |
| OS avulsa sem rastreio de cliente | Campos cache (`customerName`/`vehicleLabel`) sempre preenchidos |
| Duplicar UI admin/mecânico | Reusar os mesmos modais, condicionando por role |
| Divergência de total front/back | Total sempre recalculado no backend ao salvar |
