# Integração M2 Auto Hub ↔ ERP do Cliente — Relação de Dados

> **Para:** desenvolvedores do sistema de gestão (ERP) usado pelo centro automotivo do cliente.
> **De:** M2 Auto Hub.
> **Objetivo:** listar, de forma completa e detalhada, os **dados que a M2 precisa CONSUMIR** (ler do ERP) e **INJETAR** (escrever no ERP) para que as funcionalidades da nossa aplicação operem integradas, e o que devemos prever para o futuro.

> **Base desta relação:** levantada diretamente do schema do banco (`prisma/schema.prisma`), das rotas Express realmente expostas (`src/modules/**/*.routes.ts`) e dos DTOs de entrada/saída (`src/modules/**/dto/*`). Não há suposições — cada entidade abaixo existe hoje no nosso banco/API.

- **Data:** 2026-07-02
- **Sistema M2:** Node.js + Express + PostgreSQL (Prisma). Modelo **single-tenant** (uma loja/oficina).

---

## 0. Antes de tudo: autenticação e sentido da integração

**Como a M2 autentica hoje (internamente):** JWT via cookie httpOnly (`adminToken` para painel, `authToken` para cliente) ou header `Authorization: Bearer <token>`. **Não temos hoje autenticação por API key** — ela precisa ser criada em qualquer um dos lados que expuser a API.

Nesta integração há **dois sentidos** e o cliente precisa deixar claro qual (ou ambos) vão valer:

| Sentido | Quem expõe a API | Quem recebe a API key | O que precisamos |
|---|---|---|---|
| **A. M2 consome do ERP** | ERP do cliente | **M2** (nós) | Uma **API key** + a documentação dos endpoints do ERP para lermos os dados abaixo |
| **B. M2 injeta no ERP** | ERP do cliente | **M2** (nós) | Endpoints de escrita no ERP + a mesma API key |
| **C. ERP consome/injeta na M2** | **M2** (nós) | ERP do cliente | Nós criamos os endpoints + geramos uma API key para eles (hoje não existe; ver §7) |

> **Pergunta a devolver aos desenvolvedores do ERP:** a integração será **A+B** (a M2 chama o ERP) ou **C** (o ERP chama a M2), ou os três? A lista de dados abaixo serve para os dois lados — muda apenas quem hospeda o endpoint.

**Requisitos técnicos que pedimos ao ERP (sentidos A/B):**
- API **REST/JSON** sobre **HTTPS**.
- Autenticação por **API key** (header, ex.: `X-API-Key` ou `Authorization: Bearer`).
- **Paginação** (page/limit ou cursor) e **filtro por data de atualização** (`updatedSince`) para sincronização incremental.
- **Identificador estável** por registro (id do ERP) — vamos guardar como referência cruzada.
- Idealmente **webhooks** do ERP para eventos (novo pedido, estoque alterado, OS atualizada) — evita polling.
- Formato de datas **ISO 8601 UTC**; valores monetários com 2 casas decimais; enums documentados.

---

## 1. Visão geral das entidades

Domínios que a M2 mantém e que fazem parte da integração (todos existem no banco hoje):

| # | Domínio | Consumir (ler do ERP) | Injetar (escrever no ERP) | Prioridade |
|---|---|---|---|---|
| 1 | **Produtos / Estoque** | ✅ | ✅ | **Alta** |
| 2 | **Serviços (mão de obra)** | ✅ | ✅ | **Alta** |
| 3 | **Clientes** | ✅ | ✅ | **Alta** |
| 4 | **Veículos do cliente** | ✅ | ✅ | **Alta** |
| 5 | **Ordens de Serviço (OS)** | ✅ | ✅ | **Alta** |
| 6 | **Pedidos / Vendas** | ✅ | ✅ | Alta |
| 7 | **Revisões veiculares** | ✅ | ✅ | Média |
| 8 | **Categorias (produto/serviço)** | ✅ | — | Média |
| 9 | **Catálogo de veículos (marca/modelo/variante)** | ✅ | — | Média |
| 10 | **Compatibilidade peça↔veículo** | ✅ | ✅ | Média |
| 11 | **Cupons / Promoções** | ✅ | ✅ | Baixa |
| 12 | **Fidelidade (pontos)** | ✅ | ✅ | Baixa |
| 13 | **Financeiro (pagamentos/recebimentos)** | ✅ | ✅ | **Futuro** (ver §6) |
| 14 | **Fornecedores / Compras (entrada de estoque)** | ✅ | ✅ | **Futuro** (ver §6) |
| 15 | **Fiscal (NF-e/NFC-e/NFS-e)** | ✅ | ✅ | **Futuro** (ver §6) |

Abaixo, o detalhamento **campo a campo** de cada entidade, com tipo e obrigatoriedade.

---

## 2. Entidades atuais — detalhamento campo a campo

Legenda de tipo: `string`, `int`, `decimal(10,2)`, `bool`, `datetime (ISO)`, `enum`, `uuid`, `json`.
Legenda de uso: **R** = queremos ler do ERP; **W** = queremos escrever no ERP.

### 2.1 Produto / Estoque `products`  (R+W)
Origem no M2: `model Product`, `POST/PUT /admin/products`, `PATCH /admin/products/:id/stock`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | id do produto no ERP (guardaremos como referência) |
| name | string(3–200) | sim | |
| description | string | sim | |
| category | string | sim | nome da categoria |
| subcategory | string | não | |
| **sku** | string(3–50) | sim | **chave de conciliação** produto↔ERP (único) |
| supplier | string | sim | fornecedor |
| costPrice | decimal(10,2) | sim | preço de custo |
| salePrice | decimal(10,2) | sim | preço de venda |
| promoPrice | decimal(10,2) | não | preço promocional |
| **stock** | int | sim | **saldo em estoque** (campo mais crítico para sincronizar) |
| minStock | int | não | estoque mínimo (default 5) |
| images | string[] (URLs) | sim | ao menos 1 |
| specifications | json | não | especificações técnicas livres |
| status | enum | sim | `ACTIVE` \| `INACTIVE` \| `OUT_OF_STOCK` \| `DISCONTINUED` |
| barcode/EAN | string | *desejável* | **não temos hoje** — pedir ao ERP se existir (útil p/ leitura) |
| unit (un/kg/L) | string | *desejável* | unidade de medida — **não temos hoje** |
| ncm | string | *desejável* | p/ fiscal futuro — **não temos hoje** |
| createdAt / updatedAt | datetime | — | usamos `updatedAt` para sync incremental |

**Operações desejadas:** listar produtos (com `updatedSince`), obter por SKU, **atualizar saldo de estoque** (ler do ERP e injetar de volta quando a M2 dá baixa via OS/venda), criar/atualizar produto.

### 2.2 Serviço (mão de obra) `services`  (R+W)
Origem: `model Service`, `POST/PUT /admin/services`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | |
| name | string(3–200) | sim | |
| description | string | sim | |
| category | string | sim | |
| estimatedTime | string | sim | ex.: "2 horas" |
| basePrice | decimal(10,2) | não | preço base da mão de obra |
| specifications | json | não | |
| status | enum | sim | `ACTIVE` \| `INACTIVE` |

### 2.3 Cliente `customers`  (R+W)
Origem: `model Customer`, `POST /admin/customers`, `GET /admin/customers`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | referência cruzada |
| name | string | sim | |
| **email** | string | sim | único no M2 (chave de conciliação) |
| **phone** | string | sim | telefone/WhatsApp |
| **cpf** | string | não | único; ótima chave de conciliação p/ PF |
| cnpj | string | *desejável* | **não temos hoje** — pedir se ERP tem PJ |
| birthDate | datetime | não | |
| status | enum | sim | `ACTIVE` \| `INACTIVE` \| `BLOCKED` |
| level | enum | não | `BRONZE`\|`SILVER`\|`GOLD`\|`PLATINUM` (fidelidade) |
| totalOrders | int | — | agregado (calculado) |
| totalSpent | decimal(10,2) | — | agregado (calculado) |

**Endereço do cliente** `addresses` (R+W) — 1:N:
| Campo | Tipo | Obrig. |
|---|---|---|
| type | enum `HOME`\|`WORK`\|`OTHER` | não |
| street, number | string | sim |
| complement | string | não |
| neighborhood, city | string | sim |
| state | char(2) | sim (UF) |
| zipCode | char(8) | sim (CEP só dígitos) |
| isDefault | bool | não |

### 2.4 Veículo do cliente `customer_vehicles`  (R+W)
Origem: `model CustomerVehicle`, `POST /admin/customers/:id/vehicles`, `GET /admin/vehicles/lookup?plate=`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | |
| customerId | ref | sim | dono do veículo |
| brand | string | sim | marca |
| model | string | sim | modelo |
| year | int | sim | ano |
| **plate** | string(7–10) | sim | **placa — único; principal chave de busca** (usamos leitura por placa/ALPR) |
| chassisNumber | string(17) | não | chassi |
| color | string | não | |
| mileage | int | não | quilometragem |
| renavam | string | *desejável* | **não temos hoje** — pedir se ERP tiver |

**Endpoint muito usado por nós:** **consulta por placa** → retorna veículo + cliente. É a base da nossa tela "Consulta por Placa". Queremos poder buscar no ERP por placa e receber `{ veiculo, cliente, historico }`.

### 2.5 Ordem de Serviço (OS) `service_orders` + `service_order_items`  (R+W)
Origem: `model ServiceOrder`/`ServiceOrderItem`, `POST/PUT /service-orders`, `PATCH .../complete|cancel`, `POST .../assign-mechanic`.

**Cabeçalho da OS:**
| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | |
| number | int | — | número sequencial humano (OS #1001) |
| status | enum | sim | `OPEN` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |
| customerId | ref | não | cliente cadastrado (ou avulso) |
| vehicleId | ref | não | veículo cadastrado (ou avulso) |
| customerName | string | sim | cache/avulso |
| customerPhone | string | não | |
| vehicleLabel | string | não | ex.: "Gol 2018 - ABC1D23" |
| vehiclePlate | string | não | |
| mileage | int | não | km na entrada |
| description | string | não | descrição do problema/serviço |
| internalNotes | string | não | observações internas |
| assignedMechanicId | ref | não | mecânico responsável |
| mechanicName | string | não | cache do nome |
| laborTotal | decimal(10,2) | — | soma dos serviços |
| partsTotal | decimal(10,2) | — | soma dos produtos |
| discount | decimal(10,2) | não | |
| total | decimal(10,2) | — | labor + parts − discount |
| completedAt / cancelledAt | datetime | — | |

**Item da OS** (1:N) — serviço OU produto:
| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| type | enum `SERVICE`\|`PRODUCT` | sim | |
| productId / serviceId | ref | não | referência ao catálogo (para dar baixa de estoque) |
| name | string | sim | cache do nome no momento |
| unitPrice | decimal(10,2) | sim | |
| quantity | int | sim | |
| subtotal | decimal(10,2) | — | unitPrice × quantity |

**Regra crítica de estoque:** ao **concluir** a OS, a M2 dá **baixa de estoque** dos itens `PRODUCT` (e estorna ao cancelar). Para manter o ERP como fonte da verdade do estoque, precisamos **injetar essas baixas/estornos no ERP** (ou consumir o saldo atualizado dele). Definir com o ERP quem é a fonte da verdade do estoque.

### 2.6 Pedido / Venda `orders` + `order_items`  (R+W)
Origem: `model Order`/`OrderItem`, `POST /admin/orders`, `GET /admin/orders`, `PATCH /admin/orders/:id/status`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | |
| customerId | ref | sim | |
| addressId | ref | sim | entrega |
| status | enum | sim | `PENDING`\|`CONFIRMED`\|`IN_PRODUCTION`\|`PREPARING`\|`SHIPPED`\|`DELIVERED`\|`CANCELLED` |
| source | enum | sim | `WEB`\|`APP`\|`PHONE`\|`MERCADO_LIVRE`\|`SHOPEE` |
| hasProducts / hasServices | bool | — | |
| subtotal / discountAmount / total | decimal(10,2) | sim | |
| paymentMethod | string | sim | forma de pagamento |
| trackingCode | string | não | rastreio |
| estimatedDelivery / deliveredAt | datetime | não | |
| couponCode | string | não | |
| externalOrderId / externalProvider | string/enum | não | quando veio de marketplace |
| **items[]** | array | sim | `{ type PRODUCT/SERVICE, productId/serviceId, name, price, quantity, subtotal }` |

### 2.7 Revisão veicular `revisions`  (R+W)
Origem: `model Revision`, `POST/PUT /admin/revisions`, `PATCH .../start|complete|cancel`.

| Campo | Tipo | Obrig. | Observação |
|---|---|---|---|
| id (ref. ERP) | string/uuid | — | |
| customerId / vehicleId | ref | sim | |
| date | datetime | sim | |
| mileage | int | não | |
| status | enum | sim | `DRAFT`\|`IN_PROGRESS`\|`COMPLETED`\|`CANCELLED` |
| checklistItems | json | sim | itens verificados (categoria, item, status, notas, fotos) |
| generalNotes / recommendations | string | não | |
| assignedMechanicId / mechanicName | ref/string | não | |
| completedAt | datetime | — | |

**Agendamento de revisão** `revision_appointments` (R+W) — `status`: `REQUESTED`\|`SCHEDULED`\|`IN_SERVICE`\|`COMPLETED`\|`CANCELLED`; datas `preferredDate`/`scheduledAt`.

### 2.8 Categorias (R)
- `product_categories` e `service_categories`: apenas `{ id, name }`. Consumir do ERP para alinhar nomenclatura.

### 2.9 Catálogo de veículos (R)
Origem: `vehicle_makes` / `vehicle_models` / `vehicle_variants` (`GET /vehicles/...`).
- **Marca**: `{ name, country, logo, active }`.
- **Modelo**: `{ makeId, name, segment, bodyType, fuelTypes[], active }`.
- **Variante**: `{ modelId, name, engineInfo(json), transmission, yearStart, yearEnd, specifications(json) }`.
Se o ERP tiver uma base FIPE/veículos, consumir dela é o ideal.

### 2.10 Compatibilidade peça ↔ veículo `product_vehicle_compatibility` (R+W)
`{ productId, makeId?, modelId?, variantId?, yearStart?, yearEnd?, compatibilityData(json), verified, notes }`. Útil se o ERP tiver aplicação/compatibilidade de autopeças.

### 2.11 Cupom / Promoção (R+W) — prioridade baixa
- **Cupom** `coupons`: `{ code(único), description, discountType(PERCENTAGE/FIXED), discountValue, minValue?, maxDiscount?, expiresAt, usageLimit?, usedCount, isActive }`.
- **Promoção** `promotions`: estrutura rica (regras/tiers/segmentação em json) — provavelmente fica só na M2; sincronizar só se o ERP também gerir campanhas.

### 2.12 Fidelidade (R+W) — prioridade baixa
- `loyalty_rewards`, `loyalty_redemptions`, `loyalty_transactions`: pontos por cliente, recompensas, resgates. Sincronizar só se o ERP controlar programa de pontos.

---

## 3. Chaves de conciliação (como cruzamos os dois sistemas)

Para não duplicar registros, precisamos de identificadores estáveis. Ordem de preferência por entidade:

| Entidade | Chave primária de conciliação | Alternativa |
|---|---|---|
| Produto | **SKU** | id do ERP / barcode/EAN |
| Serviço | nome + categoria | id do ERP |
| Cliente | **CPF** (PF) / CNPJ (PJ) | email → telefone |
| Veículo | **placa** | chassi (VIN) |
| OS / Pedido / Revisão | **id do ERP** | number sequencial |

> Pedimos que o ERP exponha e aceite um **id externo** (o nosso) OU nos devolva sempre o **id do ERP** na resposta de escrita, para gravarmos a referência cruzada dos dois lados.

---

## 4. Operações (endpoints) que precisamos do ERP

Para cada entidade R+W, o mínimo funcional:

- `GET /{entidade}?updatedSince=&page=&limit=` — sincronização incremental (consumir).
- `GET /{entidade}/{id}` — detalhe.
- `GET /produtos?sku=` e `GET /veiculos?placa=` — **buscas-chave** que usamos muito.
- `POST /{entidade}` / `PUT /{entidade}/{id}` — injetar/atualizar.
- `PATCH /produtos/{id}/estoque` — **ajuste de saldo** (baixa/estorno vindos de OS/venda). Idealmente com operação idempotente (referência da OS/venda).
- **Webhooks do ERP → M2** (desejável): `produto.estoque_alterado`, `pedido.criado`, `os.atualizada`, `cliente.atualizado`.

---

## 5. Eventos que a M2 gera e quer refletir no ERP (injeção)

Momentos em que a M2 escreve dados que o ERP precisa saber:

1. **OS concluída** → baixa de estoque dos produtos usados + registro do serviço/valor.
2. **OS cancelada** → estorno de estoque.
3. **Venda/pedido criado** → baixa de estoque + lançamento da venda.
4. **Cliente/veículo cadastrado pela M2** (ex.: pela leitura de placa) → criar no ERP.
5. **Atualização de status** de pedido/OS/revisão.
6. **Venda de marketplace importada** (Mercado Livre/Shopee) → lançar no ERP como venda com `source`.

---

## 6. Dados que ainda NÃO temos e podemos precisar (prever com o ERP)

Estes **não existem no nosso banco hoje**, mas são prováveis na evolução — vale já pedir ao ERP para não refazer a integração depois:

| Domínio futuro | Dados | Por quê |
|---|---|---|
| **Financeiro** | contas a receber/pagar, formas e status de pagamento, parcelas, caixa | fechar o ciclo financeiro da OS/venda |
| **Fiscal** | NF-e / NFC-e / NFS-e (emissão e consulta), NCM, CFOP, CST, alíquotas | emissão fiscal a partir de OS/venda |
| **Compras / Fornecedores** | fornecedores (cadastro), pedidos de compra, **entrada de estoque** (nota de entrada), custo médio | fonte da verdade do estoque de entrada |
| **Produto — complementos** | **barcode/EAN**, unidade de medida, NCM, localização física, lote/validade | leitura por código de barras e fiscal |
| **Cliente — PJ** | **CNPJ**, inscrição estadual, contato/representante | atender empresas |
| **Veículo** | **RENAVAM**, combustível, motorização | dados completos do veículo |
| **Agenda/Box** | agendamento por box/elevador, disponibilidade | agenda operacional da oficina |
| **Colaboradores** | mecânicos/vendedores do ERP (id, nome, comissão) | vincular OS ao profissional do ERP |
| **Ordem de compra ↔ estoque** | movimentações de estoque (kardex) | rastreabilidade completa |

---

## 7. Se o fluxo for o inverso (ERP consome a M2) — §0 sentido C

Hoje a M2 **não expõe API key**. Se o cliente quiser que o ERP **leia/escreva na M2**, precisamos implementar do nosso lado:
- Emissão e validação de **API key** (header) + escopos por permissão.
- Os mesmos endpoints REST já existem internamente (listados em §2), hoje protegidos por JWT de admin — teríamos que habilitá-los para API key.
- **Webhooks da M2 → ERP** para: OS criada/concluída/cancelada, venda criada, estoque alterado, cliente/veículo criado.

> É uma implementação de porte médio do nosso lado; se for esse o caminho, tratamos como um épico separado.

---

## 8. Resumo do que pedir aos desenvolvedores do ERP

1. **Uma API key** (+ ambiente de sandbox) e a **documentação** dos endpoints REST/JSON.
2. Confirmar o **sentido** da integração (§0: A+B, C, ou todos).
3. Para cada entidade de §2 (começando por **Produto/Estoque, Cliente, Veículo, Serviço, OS**): endpoints de **listar (com `updatedSince`)**, **obter por chave** (SKU/placa/CPF), **criar/atualizar** e **ajuste de estoque**.
4. **Webhooks** do ERP (se houver) para estoque, pedido e OS.
5. Confirmar **quem é a fonte da verdade do estoque** (ERP ou M2) — define o sentido da sincronização de saldo.
6. Definir **chaves de conciliação** aceitas (§3) e se o ERP guarda um **id externo** nosso.
7. Indicar quais dos **domínios futuros** (§6) o ERP já expõe, para prevermos.

---

### Apêndice — Enums (valores possíveis) usados pela M2
- **ProductStatus:** ACTIVE, INACTIVE, OUT_OF_STOCK, DISCONTINUED
- **ServiceStatus:** ACTIVE, INACTIVE
- **OrderStatus:** PENDING, CONFIRMED, IN_PRODUCTION, PREPARING, SHIPPED, DELIVERED, CANCELLED
- **OrderSource:** WEB, APP, PHONE, MERCADO_LIVRE, SHOPEE
- **ServiceOrderStatus:** OPEN, IN_PROGRESS, COMPLETED, CANCELLED
- **ServiceOrderItemType / OrderItemType:** PRODUCT, SERVICE
- **RevisionStatus:** DRAFT, IN_PROGRESS, COMPLETED, CANCELLED
- **RevisionAppointmentStatus:** REQUESTED, SCHEDULED, IN_SERVICE, COMPLETED, CANCELLED
- **CustomerStatus:** ACTIVE, INACTIVE, BLOCKED
- **CustomerLevel:** BRONZE, SILVER, GOLD, PLATINUM
- **AddressType:** HOME, WORK, OTHER
