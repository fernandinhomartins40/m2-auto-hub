import {
  MarketplaceProvider,
  ListingSyncStatus,
  MarketplaceConnectionStatus,
  MarketplaceListing,
  Prisma,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { CryptoUtil } from '@shared/utils/crypto.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { loadAndNormalizeProduct } from '../mappers/product-normalizer.js';
import { NormalizedProduct } from '../marketplace.types.js';

/** Gera o hash do payload publicado (preco+estoque+nome+imagens) para detectar drift. */
function listingHash(p: NormalizedProduct): string {
  return CryptoUtil.sha256Hex(
    JSON.stringify({ name: p.name, price: p.price, stock: p.stock, images: p.images, desc: p.description })
  );
}

export class ListingService {
  /** Lista todos os vinculos produto<->anuncio com dados do produto. */
  async list(provider?: MarketplaceProvider) {
    return prisma.marketplaceListing.findMany({
      where: provider ? { provider } : undefined,
      include: {
        product: { select: { id: true, name: true, sku: true, salePrice: true, stock: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getById(id: string): Promise<MarketplaceListing> {
    const listing = await prisma.marketplaceListing.findUnique({ where: { id } });
    if (!listing) throw ApiError.notFound('Anuncio nao encontrado.');
    return listing;
  }

  /**
   * Publica (ou republica) um produto em um provider.
   * Idempotente: se ja existir anuncio publicado, faz update; senao, cria.
   */
  async publish(
    productId: string,
    provider: MarketplaceProvider,
    categoryMapping?: Record<string, unknown>
  ): Promise<MarketplaceListing> {
    const conn = await connectionService.getRawOrThrow(provider);
    if (conn.status !== MarketplaceConnectionStatus.CONNECTED) {
      throw ApiError.badRequest(`Conecte sua conta ${provider} antes de publicar.`);
    }

    const normalized = await loadAndNormalizeProduct(productId);
    if (!normalized) throw ApiError.notFound('Produto nao encontrado.');

    // Upsert do registro de listing (estado QUEUED enquanto publica)
    let listing = await prisma.marketplaceListing.upsert({
      where: { productId_provider: { productId, provider } },
      update: {
        status: ListingSyncStatus.QUEUED,
        categoryMapping: (categoryMapping as Prisma.InputJsonValue) ?? undefined,
        lastError: null,
      },
      create: {
        productId,
        provider,
        connectionId: conn.id,
        status: ListingSyncStatus.QUEUED,
        categoryMapping: (categoryMapping as Prisma.InputJsonValue) ?? undefined,
      },
    });

    const account = await tokenRefreshService.ensureFreshToken(provider);
    const adapter = getAdapter(provider);

    // Injeta o mapping de categoria no objeto normalizado para o adapter usar
    const withMapping = {
      ...normalized,
      categoryMapping: (listing.categoryMapping as Record<string, unknown>) ?? categoryMapping ?? null,
    } as NormalizedProduct;

    try {
      let result;
      if (listing.externalId) {
        // Ja publicado: atualiza preco/estoque
        await adapter.updateListing(account, listing.externalId, {
          price: normalized.price,
          stock: normalized.stock,
        });
        result = { externalId: listing.externalId, externalUrl: listing.externalUrl, raw: null };
      } else {
        result = await adapter.publishProduct(account, withMapping);
      }

      listing = await prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: {
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          status: ListingSyncStatus.PUBLISHED,
          publishedAt: listing.publishedAt ?? new Date(),
          lastSyncedPrice: new Prisma.Decimal(normalized.price),
          lastSyncedStock: normalized.stock,
          lastSyncedHash: listingHash(normalized),
          lastError: null,
        },
      });

      await connectionService.markSynced(provider);
      logger.info('[Listing] publicado', { provider, productId, externalId: result.externalId });
      return listing;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      listing = await prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { status: ListingSyncStatus.ERROR, lastError: message },
      });
      throw err instanceof ApiError ? err : ApiError.badRequest(`Falha ao publicar: ${message}`);
    }
  }

  /** Forca a ressincronizacao (preco/estoque) de um listing existente. */
  async sync(id: string): Promise<MarketplaceListing> {
    const listing = await this.getById(id);
    if (!listing.externalId) {
      return this.publish(listing.productId, listing.provider);
    }

    const normalized = await loadAndNormalizeProduct(listing.productId);
    if (!normalized) throw ApiError.notFound('Produto nao encontrado.');

    const account = await tokenRefreshService.ensureFreshToken(listing.provider);
    const adapter = getAdapter(listing.provider);

    try {
      await adapter.updateListing(account, listing.externalId, {
        price: normalized.price,
        stock: normalized.stock,
      });

      const updated = await prisma.marketplaceListing.update({
        where: { id },
        data: {
          status: normalized.stock <= 0 ? ListingSyncStatus.PAUSED : ListingSyncStatus.PUBLISHED,
          lastSyncedPrice: new Prisma.Decimal(normalized.price),
          lastSyncedStock: normalized.stock,
          lastSyncedHash: listingHash(normalized),
          lastError: null,
        },
      });

      // Pausa automaticamente quando estoque zera (anti-overselling)
      if (normalized.stock <= 0) {
        await adapter.pauseListing(account, listing.externalId).catch(() => undefined);
      }

      await connectionService.markSynced(listing.provider);
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.marketplaceListing.update({
        where: { id },
        data: { status: ListingSyncStatus.OUT_OF_SYNC, lastError: message },
      });
      throw err instanceof ApiError ? err : ApiError.badRequest(`Falha ao sincronizar: ${message}`);
    }
  }

  async pause(id: string): Promise<MarketplaceListing> {
    const listing = await this.getById(id);
    if (listing.externalId) {
      const account = await tokenRefreshService.ensureFreshToken(listing.provider);
      await getAdapter(listing.provider).pauseListing(account, listing.externalId);
    }
    return prisma.marketplaceListing.update({
      where: { id },
      data: { status: ListingSyncStatus.PAUSED },
    });
  }

  async close(id: string): Promise<void> {
    const listing = await this.getById(id);
    if (listing.externalId) {
      const account = await tokenRefreshService.ensureFreshToken(listing.provider);
      await getAdapter(listing.provider).closeListing(account, listing.externalId).catch(err =>
        logger.warn('[Listing] falha ao encerrar no marketplace', { id, err: String(err) })
      );
    }
    await prisma.marketplaceListing.delete({ where: { id } });
  }
}

export const listingService = new ListingService();
