import { MarketplaceProvider } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { orderImportService } from './order-import.service.js';

/** Topicos que representam um pedido (geram importacao). */
const ORDER_TOPICS = new Set(['orders', 'orders_v2', 'order_status_push', 'shop_order']);

/**
 * Consome os MarketplaceEvent ainda nao processados.
 * Os webhooks apenas gravam o evento e respondem 200 rapido; este processador
 * faz o trabalho pesado de forma assincrona (idempotente).
 */
export class EventProcessorService {
  private running = false;

  async processPending(limit = 25): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await prisma.marketplaceEvent.findMany({
        where: { processed: false },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      for (const event of events) {
        try {
          await this.handle(event.provider, event.topic, event.externalId);
          await prisma.marketplaceEvent.update({
            where: { id: event.id },
            data: { processed: true, processedAt: new Date(), error: null },
          });
        } catch (err) {
          logger.warn('[EventProcessor] falha ao processar evento', {
            id: event.id,
            topic: event.topic,
            err: String(err),
          });
          await prisma.marketplaceEvent.update({
            where: { id: event.id },
            data: { error: String(err) },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async handle(provider: MarketplaceProvider, topic: string, externalId: string): Promise<void> {
    if (ORDER_TOPICS.has(topic)) {
      await orderImportService.importOrder(provider, externalId);
      return;
    }
    // outros topicos (items, questions, shipments) podem ser tratados aqui no futuro
    logger.info('[EventProcessor] topico ignorado', { provider, topic });
  }
}

export const eventProcessorService = new EventProcessorService();
