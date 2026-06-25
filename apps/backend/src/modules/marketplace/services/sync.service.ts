import { ListingSyncStatus, MarketplaceConnectionStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { loadAndNormalizeProduct } from '../mappers/product-normalizer.js';

/**
 * Propaga mudancas de preco/estoque do M2 para os marketplaces e reconcilia drift.
 * Chamado pelo ProductsService (fire-and-forget) e por um job periodico.
 */
export class SyncService {
  /**
   * Propaga preco/estoque de um produto para todos os anuncios ativos.
   * Seguro para chamar em fire-and-forget (nunca lanca).
   */
  async syncProduct(productId: string): Promise<void> {
    try {
      const listings = await prisma.marketplaceListing.findMany({
        where: {
          productId,
          externalId: { not: null },
          status: { in: [ListingSyncStatus.PUBLISHED, ListingSyncStatus.OUT_OF_SYNC, ListingSyncStatus.PAUSED] },
        },
      });
      if (listings.length === 0) return;

      const normalized = await loadAndNormalizeProduct(productId);
      if (!normalized) return;

      for (const listing of listings) {
        const conn = await connectionService.getRaw(listing.provider);
        if (!conn || conn.status !== MarketplaceConnectionStatus.CONNECTED) continue;

        const priceChanged =
          listing.lastSyncedPrice === null || Number(listing.lastSyncedPrice) !== normalized.price;
        const stockChanged = listing.lastSyncedStock !== normalized.stock;
        if (!priceChanged && !stockChanged) continue;

        try {
          const account = await tokenRefreshService.ensureFreshToken(listing.provider);
          const adapter = getAdapter(listing.provider);
          await adapter.updateListing(account, listing.externalId as string, {
            price: priceChanged ? normalized.price : undefined,
            stock: stockChanged ? normalized.stock : undefined,
          });

          // Pausa quando estoque zera (anti-overselling)
          let nextStatus: ListingSyncStatus = ListingSyncStatus.PUBLISHED;
          if (normalized.stock <= 0) {
            nextStatus = ListingSyncStatus.PAUSED;
            await adapter.pauseListing(account, listing.externalId as string).catch(() => undefined);
          }

          await prisma.marketplaceListing.update({
            where: { id: listing.id },
            data: {
              lastSyncedPrice: new Prisma.Decimal(normalized.price),
              lastSyncedStock: normalized.stock,
              status: nextStatus,
              lastError: null,
            },
          });
        } catch (err) {
          logger.warn('[Sync] falha ao propagar produto', {
            productId,
            provider: listing.provider,
            err: String(err),
          });
          await prisma.marketplaceListing.update({
            where: { id: listing.id },
            data: { status: ListingSyncStatus.OUT_OF_SYNC, lastError: String(err) },
          });
        }
      }
    } catch (err) {
      logger.warn('[Sync] syncProduct erro inesperado', { productId, err: String(err) });
    }
  }

  /**
   * Reconciliacao periodica: reprocessa anuncios marcados como OUT_OF_SYNC.
   */
  async reconcile(): Promise<void> {
    const stale = await prisma.marketplaceListing.findMany({
      where: { status: ListingSyncStatus.OUT_OF_SYNC, externalId: { not: null } },
      take: 50,
    });
    for (const listing of stale) {
      await this.syncProduct(listing.productId);
    }
    if (stale.length > 0) {
      logger.info('[Sync] reconciliacao concluida', { count: stale.length });
    }
  }
}

export const syncService = new SyncService();
