# Auditoria de Alinhamento Frontend x Backend

Data: 2026-04-22

Objetivo: identificar onde o frontend diverge do backend atual, assumindo que o backend e seus contratos são a fonte de verdade. A orientação para os próximos passos é preservar a interface existente sempre que possível, ajustando comportamento, fluxos e consumo de dados no frontend.

## Achados Prioritários

### 1. Checkout de convidado expõe validação de cupom que o backend só permite para usuários autenticados

- Frontend:
  - `apps/frontend/src/components/CheckoutDrawer.tsx:318-350` envia pedido de convidado por `POST /orders/guest`.
  - `apps/frontend/src/components/CheckoutDrawer.tsx:544-559` renderiza `CouponInput` também nesse fluxo.
  - `apps/frontend/src/components/CouponInput.tsx:34-47` valida cupom antes de fechar a compra.
  - `apps/frontend/src/api/couponService.ts:109-125` chama `POST /coupons/validate`.
- Backend:
  - `apps/backend/src/modules/coupons/coupons.routes.ts:10-14` protege `POST /coupons/validate` com `AuthMiddleware.authenticate`.
  - `apps/backend/src/modules/orders/dto/create-guest-order.dto.ts:25-40` aceita `couponCode` no pedido de convidado.
  - `apps/backend/src/modules/orders/guest-orders.service.ts:309-317` aplica o desconto do cupom no fechamento do pedido de convidado.

Impacto:
- O frontend permite ao convidado tentar validar o cupom no meio do checkout, mas o backend responde como rota autenticada.
- Na prática, o cupom é suportado no pedido de convidado, porém não pode ser pré-validado pelo fluxo atual de UI.

Recomendação de ajuste no frontend:
- Manter o campo de cupom no checkout de convidado, mas remover a pré-validação síncrona para convidados.
- Alternativas seguras:
  - ocultar/desabilitar o botão de validação para convidados e informar que a validação ocorrerá no envio do pedido; ou
  - separar o comportamento do `CouponInput` por autenticação.

### 2. O total exibido no checkout considera promoções automáticas, mas o backend ignora essas promoções ao criar pedidos

- Frontend:
  - `apps/frontend/src/contexts/CartContext.tsx:211-275` calcula `autoPromotions` e `promotionDiscount`.
  - `apps/frontend/src/components/CheckoutDrawer.tsx:297-315` envia `appliedPromotions` no pedido autenticado.
  - `apps/frontend/src/components/CheckoutDrawer.tsx:320-347` envia `appliedPromotions` no pedido de convidado.
  - `apps/frontend/src/components/CheckoutDrawer.tsx:569-606` desconta promoções do total final exibido ao usuário.
- Backend:
  - `apps/backend/src/modules/orders/dto/create-order.dto.ts:15-21` não aceita `appliedPromotions`.
  - `apps/backend/src/modules/orders/dto/create-guest-order.dto.ts:25-40` também não aceita `appliedPromotions`.
  - `apps/backend/src/modules/orders/orders.service.ts:81-180` calcula total apenas com subtotal menos cupom.
  - `apps/backend/src/modules/orders/guest-orders.service.ts:305-317` calcula total apenas com subtotal menos cupom.

Impacto:
- O valor mostrado no frontend pode ficar menor que o total persistido no backend.
- Isso tende a gerar divergência de confiança no checkout, principalmente quando há promoções automáticas no carrinho.

Recomendação de ajuste no frontend:
- Se o frontend precisa refletir o backend atual, pare de subtrair `promotionDiscount` do total final do checkout.
- As promoções automáticas podem continuar sendo exibidas como informativo apenas se forem tratadas como destaque comercial, não como desconto financeiro aplicado no pedido.
- Se a intenção for manter desconto real, isso exigiria mudança no backend; como a diretriz atual é alinhar o frontend ao backend, o ajuste deve ser feito na UI.

## Achados Secundários

### 3. O código do programa de fidelidade existe no frontend, mas não há superfície correspondente no backend

- Frontend:
  - `apps/frontend/src/api/loyaltyService.ts:25-293` consome `/loyalty/*` e `/admin/loyalty/*`.
  - `apps/frontend/src/components/admin/LoyaltyManagement.tsx:38-48` usa esse cliente.
- Backend:
  - `apps/backend/src/app.ts:92-112` registra as rotas reais do servidor e não inclui nenhum módulo `loyalty`.

Impacto:
- O componente e o cliente estão desalinhados com a API real.
- Hoje isso parece código pronto para uma funcionalidade ainda não implementada no backend.

Recomendação de ajuste no frontend:
- Manter esses componentes fora da navegação principal.
- Se a funcionalidade não será implementada no backend no curto prazo, colocar sob feature flag ou remover a superfície do frontend para evitar reuso acidental.

### 4. O gerenciamento de frete/rastreamento no frontend não tem backend correspondente

- Frontend:
  - `apps/frontend/src/api/shippingService.ts:51-125` consome `/shipping/methods/*` e `/orders/:id/tracking`.
  - `apps/frontend/src/components/admin/ShippingMethodsManagement.tsx:11-159` depende desse cliente.
- Backend:
  - `apps/backend/src/app.ts:92-112` não registra nenhum módulo `/shipping`.
  - `apps/backend/src/modules/orders/orders.routes.ts:21-27` não expõe sub-rotas `/orders/:id/tracking`.

Impacto:
- É uma superfície de frontend sem backend equivalente.
- Pelo rastreamento atual do código, o componente não está conectado ao fluxo principal, então o risco é mais de drift do que de erro em produção imediata.

Recomendação de ajuste no frontend:
- Não expor essa gestão na UI principal enquanto o backend não existir.
- Tratar como funcionalidade futura, não como funcionalidade ativa.

### 5. Há clientes de API legados no frontend que não correspondem às rotas reais do backend

Casos identificados:

- `apps/frontend/src/api/landing.ts:41-70` espera `/landing/services`, `/landing/products`, `/landing/promotions`, mas o backend expõe `landing-page/config` e os módulos normais em `apps/backend/src/app.ts:70-112`.
- `apps/frontend/src/api/orderService.ts:61-73` usa `/orders/:id/status`, `PATCH /orders/:id/cancel` e `/orders/:id/tracking`, enquanto o backend expõe `PATCH /orders/:id` e `POST /orders/:id/cancel` em `apps/backend/src/modules/orders/orders.routes.ts:21-27`.
- `apps/frontend/src/api/revisionService.ts:67-72` usa `PATCH /admin/revisions/:id/checklist`, mas não existe rota equivalente em `apps/backend/src/modules/admin/admin.routes.ts:75-86` nem em `apps/backend/src/modules/revisions/revisions.routes.ts:23-39`.
- `apps/frontend/src/api/uploadService.ts:10-28` espera `/uploads/images`, mas o backend só registra `app.use('/uploads', express.static(...))` em `apps/backend/src/app.ts:52`.
- `apps/frontend/src/api/promotionService.ts:108-249` expõe endpoints avançados como `/promotions/evaluate`, `/promotions/applicable`, `/promotions/templates`, `/promotions/bulk/*`, enquanto o backend real tem apenas o conjunto de rotas em `apps/backend/src/modules/promotions/promotions.routes.ts:9-24`.

Impacto:
- Parte desse código parece não estar conectada às telas principais hoje, mas representa dívida técnica concreta.
- O risco é alguém reaproveitar esses clientes assumindo que a API existe, gerando bugs de integração depois.

Recomendação de ajuste no frontend:
- Consolidar os serviços de API ativos em torno das rotas realmente registradas no backend.
- Remover, arquivar ou colocar sob camada explícita de legado os clientes que apontam para contratos inexistentes.

## Capacidades do Backend pouco refletidas no Frontend

Itens já disponíveis no backend, mas pouco ou nada aproveitados na UI atual:

- `GET /coupons/customer-available` em `apps/backend/src/modules/coupons/coupons.routes.ts:12-14`.
- Histórico de configuração da landing page em `apps/backend/src/modules/landing-page/landing-page.routes.ts:258-584`, enquanto o frontend usa apenas gravação básica e histórico manual em `apps/frontend/src/hooks/useLandingPageConfig.ts:198-229`.

Observação:
- Esses pontos não são bugs por si só. São oportunidades para reduzir lógica própria do frontend e aproximá-lo das capacidades já existentes no backend.

## Direção Recomendada para Ajuste do Frontend

1. Corrigir primeiro o checkout:
   - separar o fluxo de cupom para convidado;
   - remover desconto efetivo de promoções automáticas do total final enquanto o backend não o persistir.

2. Higienizar a camada de API:
   - manter apenas serviços aderentes às rotas registradas em `apps/backend/src/app.ts`;
   - marcar como legado ou remover `landing.ts`, `uploadService.ts`, partes avançadas de `promotionService.ts`, `shippingService.ts` e `loyaltyService.ts`.

3. Preservar a UI, mas esconder superfícies não suportadas:
   - fidelidade e frete/rastreamento devem continuar fora da navegação principal até que o backend exista.

4. Sempre que houver divergência entre “o que a tela mostra” e “o que o pedido salvo contém”, priorizar a semântica do backend:
   - o frontend deve refletir o valor real persistido e as regras efetivamente aceitas pela API.
