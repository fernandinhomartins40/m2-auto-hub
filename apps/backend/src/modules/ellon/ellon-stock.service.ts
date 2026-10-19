import { EllonEntityType, OrderStatus, ServiceOrderStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { linkMetadata } from './ellon-export.service.js';
import { DAY_MS } from './ellon-sync.util.js';

export interface StockReservation {
  sourceType: 'ORDER' | 'SERVICE_ORDER';
  sourceId: string;
  label: string;
  productId: string;
  productName: string;
  quantity: number;
  since: Date;
  preOrder: string | null;
  expired: boolean;
}

/** Faturamento confirmado na Ellon: a partir daí o estoque da Ellon já reflete a saída. */
export function isInvoiced(metadata: Record<string, unknown>): boolean {
  return Boolean(metadata.ellonInvoicedAt || metadata.ellonSaleId || metadata.nfe || metadata.ellonInvoiced);
}

/**
 * Reservas = saídas que o M2 já baixou localmente (pedido criado, OS concluída) e que a
 * Ellon ainda não faturou. A sincronização de produtos aplica estoque = Ellon − reservas,
 * evitando que o estoque "volte" a cada sincronização e a mesma peça seja vendida duas vezes.
 * São derivadas dos próprios pedidos/OS, então não há registro paralelo para dessincronizar.
 */
export class EllonStockService {
  async reservations(): Promise<StockReservation[]> {
    const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    const ttlMs = Math.max(1, connection?.reservationTtlDays ?? 15) * DAY_MS;
    // Reservas vencidas continuam listadas por 30 dias para conferência manual.
    const since = new Date(Date.now() - ttlMs - 30 * DAY_MS);
    const expiredBefore = Date.now() - ttlMs;

    const [orders, serviceOrders, productLinks] = await Promise.all([
      prisma.order.findMany({
        where: { status: { not: OrderStatus.CANCELLED }, createdAt: { gte: since } },
        select: { id: true, createdAt: true, items: { where: { type: 'PRODUCT', productId: { not: null } }, select: { productId: true, name: true, quantity: true } } },
      }),
      prisma.serviceOrder.findMany({
        where: { status: ServiceOrderStatus.COMPLETED, stockApplied: true, completedAt: { gte: since } },
        select: { id: true, number: true, completedAt: true, items: { where: { type: 'PRODUCT', productId: { not: null } }, select: { productId: true, name: true, quantity: true } } },
      }),
      prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.PRODUCT }, select: { localId: true } }),
    ]);
    const ellonProducts = new Set(productLinks.map(link => link.localId));
    const sourceIds = [...orders.map(item => item.id), ...serviceOrders.map(item => item.id)];
    const links = sourceIds.length
      ? await prisma.ellonEntityLink.findMany({
        where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, localId: { in: sourceIds } },
      })
      : [];
    const linkBySource = new Map(links.map(link => [`${link.entityType}:${link.localId}`, link]));

    const result: StockReservation[] = [];
    const add = (sourceType: StockReservation['sourceType'], sourceId: string, label: string, since: Date, items: Array<{ productId: string | null; name: string; quantity: number }>) => {
      const link = linkBySource.get(`${sourceType}:${sourceId}`);
      const metadata = linkMetadata(link?.metadata);
      if (isInvoiced(metadata)) return;
      // Se a Ellon já desconta pré-pedidos em aberto, o que foi enviado não pode ser subtraído de novo.
      if (link && connection?.stockIncludesPreOrders) return;
      for (const item of items) {
        if (!item.productId || !ellonProducts.has(item.productId)) continue;
        result.push({
          sourceType, sourceId, label, productId: item.productId, productName: item.name, quantity: item.quantity,
          since, preOrder: link?.externalId ?? null, expired: since.getTime() < expiredBefore,
        });
      }
    };
    for (const order of orders) add('ORDER', order.id, `Pedido ${order.id.slice(0, 8)}`, order.createdAt, order.items);
    for (const order of serviceOrders) add('SERVICE_ORDER', order.id, `OS #${order.number}`, order.completedAt ?? new Date(), order.items);
    return result;
  }

  async activeByProduct(): Promise<Map<string, number>> {
    const totals = new Map<string, number>();
    for (const reservation of await this.reservations()) {
      if (reservation.expired) continue;
      totals.set(reservation.productId, (totals.get(reservation.productId) ?? 0) + reservation.quantity);
    }
    return totals;
  }
}

export const ellonStockService = new EllonStockService();
