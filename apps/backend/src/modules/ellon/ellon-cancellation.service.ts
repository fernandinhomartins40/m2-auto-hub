import { EllonEntityType, EllonJobStatus, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { serviceOrdersService } from '../service-orders/service-orders.service.js';
import { linkMetadata } from './ellon-export.service.js';

type Entity = 'ORDER' | 'SERVICE_ORDER';
const PARKED = new Date('9000-01-01');
const CANCELLABLE_ORDER: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.IN_PRODUCTION, OrderStatus.PREPARING];

const jobKey = (entity: Entity, id: string) => entity === 'ORDER' ? `order:${id}:v1` : `service-order:${id}:v1`;

/**
 * A API Ellon não cancela pré-pedidos. Depois do envio, o cancelamento vira uma solicitação
 * registrada no M2; o operador cancela na Ellon e a sincronização conclui o cancelamento local.
 */
export class EllonCancellationService {
  private link(entity: Entity, localId: string) {
    return prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: entity as EllonEntityType, localId } } });
  }

  /**
   * Chamado antes de qualquer cancelamento local. Bloqueia quando já existe (ou pode existir)
   * pré-pedido na Ellon e descarta envios ainda não feitos.
   */
  async assertLocalCancelAllowed(entity: Entity, localId: string): Promise<void> {
    const [link, job] = await Promise.all([
      this.link(entity, localId),
      prisma.ellonJob.findUnique({ where: { idempotencyKey: jobKey(entity, localId) } }),
    ]);
    if (link && !linkMetadata(link.metadata).ellonCancelled) {
      throw ApiError.conflict(`Já existe o pré-pedido ${link.externalId} na Ellon. Use "Solicitar cancelamento na Ellon"; o cancelamento local é concluído quando a Ellon cancelar.`);
    }
    if (job?.status === EllonJobStatus.PROCESSING) {
      throw ApiError.conflict('O envio à Ellon está em andamento. Aguarde o término antes de cancelar.');
    }
    if (job?.status === EllonJobStatus.FAILED && job.nextAttemptAt >= PARKED) {
      throw ApiError.conflict('O envio à Ellon terminou sem confirmação e o pré-pedido pode existir lá. Confira na Ellon antes de cancelar.');
    }
    if (job && (job.status === EllonJobStatus.PENDING || job.status === EllonJobStatus.FAILED)) {
      await prisma.ellonJob.update({
        where: { id: job.id },
        data: { status: EllonJobStatus.CANCELLED, processedAt: new Date(), lastError: 'Cancelado no M2 antes do envio à Ellon.' },
      });
    }
  }

  async request(entity: Entity, localId: string, adminId?: string) {
    const link = await this.link(entity, localId);
    if (!link) throw ApiError.badRequest('Não há pré-pedido na Ellon para este registro; use o cancelamento normal.');
    const metadata = linkMetadata(link.metadata);
    if (metadata.ellonCancelled) {
      await this.completeLocalCancel(entity, localId);
      return { status: 'CANCELLED' as const, preOrder: link.externalId };
    }
    if (metadata.ellonInvoicedAt || metadata.nfe || metadata.ellonSaleId) {
      throw ApiError.conflict(`O pré-pedido ${link.externalId} já foi faturado na Ellon. O cancelamento exige devolução/cancelamento fiscal na Ellon.`);
    }
    await prisma.ellonEntityLink.update({
      where: { id: link.id },
      data: { metadata: { ...metadata, cancellationRequestedAt: new Date().toISOString(), cancellationRequestedBy: adminId ?? null } as Prisma.InputJsonValue },
    });
    return { status: 'REQUESTED' as const, preOrder: link.externalId };
  }

  /** Conclui no M2 o cancelamento já feito na Ellon, devolvendo o estoque baixado localmente. */
  async completeLocalCancel(entity: Entity, localId: string): Promise<boolean> {
    if (entity === 'SERVICE_ORDER') {
      await serviceOrdersService.cancel(localId);
      return true;
    }
    return prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: localId }, include: { items: true } });
      if (!order || !CANCELLABLE_ORDER.includes(order.status)) return false;
      const updated = await tx.order.updateMany({
        where: { id: localId, status: { in: CANCELLABLE_ORDER } },
        data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
      });
      if (!updated.count) return false;
      for (const item of order.items) {
        if (item.type === 'PRODUCT' && item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
      return true;
    });
  }

  async pendingRequests() {
    const links = await prisma.ellonEntityLink.findMany({
      where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] }, metadata: { path: ['cancellationRequestedAt'], not: Prisma.AnyNull } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return links.filter(link => !linkMetadata(link.metadata).ellonCancelled);
  }
}

export const ellonCancellationService = new EllonCancellationService();
