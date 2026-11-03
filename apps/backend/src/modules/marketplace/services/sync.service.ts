import { ListingSyncStatus, MarketplaceConnectionStatus, MarketplaceListing, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { loadAndNormalizeProduct } from '../mappers/product-normalizer.js';
import { NormalizedProduct } from '../marketplace.types.js';

/**
 * Propaga mudancas de preco/estoque do M2 para os marketplaces e reconcilia drift.
 * Chamado pelo ProductsService (fire-and-forget) e por um job periodico.
 */
export class SyncService {
  /**
   * Envia preco, quantidade e termos de venda a um anuncio e decide pausa/reativacao:
   * sem quantidade, o sistema pausa; com quantidade de volta, reativa so o que ele
   * mesmo pausou (pausa manual fica como esta). `force` envia mesmo sem mudanca.
   */
  async pushListing(listing: MarketplaceListing, normalized: NormalizedProduct, force = false): Promise<MarketplaceListing> {
    const priceChanged = listing.lastSyncedPrice === null || Number(listing.lastSyncedPrice) !== normalized.price;
    const stockChanged = listing.lastSyncedStock !== normalized.stock;
    const hasStock = normalized.stock > 0;
    const shouldActivate = hasStock && listing.status === ListingSyncStatus.PAUSED && listing.pausedBySystem;
    const shouldPause = !hasStock && listing.status !== ListingSyncStatus.PAUSED;
    if (!force && !priceChanged && !stockChanged && !shouldActivate && !shouldPause) return listing;

    const account = await tokenRefreshService.ensureFreshToken(listing.provider);
    const adapter = getAdapter(listing.provider);
    await adapter.updateListing(account, listing.externalId as string, {
      price: force || priceChanged ? normalized.price : undefined,
      stock: force || stockChanged ? normalized.stock : undefined,
      saleTerms: force ? normalized.publication?.saleTerms : undefined,
    });

    let status: ListingSyncStatus = listing.status === ListingSyncStatus.PAUSED ? ListingSyncStatus.PAUSED : ListingSyncStatus.PUBLISHED;
    let pausedBySystem = listing.pausedBySystem;
    if (shouldPause) {
      // Anti-overselling: sem quantidade a venda, o anuncio sai do ar.
      await adapter.pauseListing(account, listing.externalId as string).catch(() => undefined);
      status = ListingSyncStatus.PAUSED;
      pausedBySystem = true;
    } else if (shouldActivate && adapter.activateListing) {
      await adapter.activateListing(account, listing.externalId as string);
      status = ListingSyncStatus.PUBLISHED;
      pausedBySystem = false;
    }

    return prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: {
        lastSyncedPrice: new Prisma.Decimal(normalized.price),
        lastSyncedStock: normalized.stock,
        status,
        pausedBySystem,
        lastError: null,
      },
    });
  }

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

      for (const listing of listings) {
        const conn = await connectionService.getRaw(listing.provider);
        if (!conn || conn.status !== MarketplaceConnectionStatus.CONNECTED) continue;

        try {
          const normalized = await loadAndNormalizeProduct(productId, listing.provider);
          if (!normalized) return;
          await this.pushListing(listing, normalized);
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
   * Reconciliacao periodica: confere todos os anuncios publicados. O Ellon atualiza
   * estoque e preco direto no banco, entao e aqui que essas mudancas chegam ao
   * marketplace (so envia o que mudou).
   */
  async reconcile(): Promise<void> {
    const listings = await prisma.marketplaceListing.findMany({
      where: {
        externalId: { not: null },
        status: { in: [ListingSyncStatus.PUBLISHED, ListingSyncStatus.OUT_OF_SYNC, ListingSyncStatus.PAUSED] },
      },
      select: { productId: true },
      distinct: ['productId'],
    });
    for (const listing of listings) {
      await this.syncProduct(listing.productId);
    }
    if (listings.length > 0) {
      logger.info('[Sync] reconciliacao concluida', { count: listings.length });
    }
  }
}

export const syncService = new SyncService();
