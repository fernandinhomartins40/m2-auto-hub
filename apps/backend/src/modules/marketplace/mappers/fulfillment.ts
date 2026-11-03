import { MarketplaceFulfillmentStage as Stage } from '@prisma/client';

/**
 * Regras do despacho de uma venda, sem acesso a banco: em que etapa ela esta e
 * quanto de cada item sai da prateleira ou precisa vir do fornecedor.
 */

/** Status do pedido no ML em que o pagamento ainda nao foi aprovado. */
const UNPAID = new Set(['payment_required', 'payment_in_process', 'partially_paid', 'pending', 'confirmed']);
const FINAL = new Set<Stage>([Stage.DELIVERED, Stage.CANCELLED]);
/** Etapas que o lojista move a mao; o marketplace nao as conhece. */
const MANUAL = new Set<Stage>([Stage.AWAITING_SUPPLIER, Stage.TO_PICK, Stage.READY_TO_SHIP]);

export interface AllocationInput {
  productId: string | null;
  title: string;
  quantity: number;
}

export interface AllocatedItem extends AllocationInput {
  fromStore: number;
  fromSupplier: number;
  supplier: string | null;
}

/**
 * Divide cada item entre o estoque da loja (antes da baixa da venda) e o
 * fornecedor. Itens repetidos do mesmo produto consomem o mesmo estoque.
 */
export function allocate(
  items: AllocationInput[],
  stockByProduct: Map<string, number>,
  supplierByProduct: Map<string, string | null> = new Map()
): AllocatedItem[] {
  const left = new Map(stockByProduct);
  return items.map(item => {
    if (!item.productId) {
      // Item sem produto no M2: nao ha como saber o estoque, fica para conferencia na loja.
      return { ...item, fromStore: item.quantity, fromSupplier: 0, supplier: null };
    }
    const available = Math.max(0, left.get(item.productId) ?? 0);
    const fromStore = Math.min(item.quantity, available);
    left.set(item.productId, available - fromStore);
    return {
      ...item,
      fromStore,
      fromSupplier: item.quantity - fromStore,
      supplier: supplierByProduct.get(item.productId) ?? null,
    };
  });
}

export function needsSupplier(items: Array<{ fromSupplier: number }>): boolean {
  return items.some(item => item.fromSupplier > 0);
}

/**
 * Proxima etapa a partir do status do pedido e do envio no marketplace.
 * Cancelamento e entrega sempre prevalecem; o envio despachado avanca a etapa;
 * as etapas de separacao seguem o que o lojista marcou.
 */
export function nextStage(
  current: Stage | null,
  orderStatus: string,
  shipmentStatus: string | null,
  supplierPending: boolean
): Stage {
  if (current && FINAL.has(current)) return current;
  if (orderStatus === 'cancelled' || orderStatus === 'invalid' || shipmentStatus === 'cancelled') return Stage.CANCELLED;
  if (shipmentStatus === 'delivered') return Stage.DELIVERED;
  if (shipmentStatus === 'shipped' || shipmentStatus === 'not_delivered') return Stage.SHIPPED;
  if (current === Stage.SHIPPED) return current;
  if (UNPAID.has(orderStatus)) return Stage.AWAITING_PAYMENT;
  if (current && MANUAL.has(current)) return current;
  return supplierPending ? Stage.AWAITING_SUPPLIER : Stage.TO_PICK;
}

/** Venda paga que ainda precisa sair da loja. */
export function isOpen(stage: Stage): boolean {
  return MANUAL.has(stage);
}
