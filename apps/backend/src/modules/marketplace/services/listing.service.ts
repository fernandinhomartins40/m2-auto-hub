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
import { syncService } from './sync.service.js';
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

    const normalized = await loadAndNormalizeProduct(productId, provider);
    if (!normalized) throw ApiError.notFound('Produto nao encontrado.');

    // Ja publicado: atualiza preco, estoque e termos sem mexer no status (pausa manual continua)
    const existing = await prisma.marketplaceListing.findUnique({ where: { productId_provider: { productId, provider } } });
    if (existing?.externalId) {
      const updated = await syncService.pushListing(existing, normalized, true);
      await connectionService.markSynced(provider);
      return updated;
    }

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
      const result = await adapter.publishProduct(account, withMapping);

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

  /** Forca a ressincronizacao (preco/estoque/termos) de um listing existente. */
  async sync(id: string): Promise<MarketplaceListing> {
    const listing = await this.getById(id);
    if (!listing.externalId) {
      return this.publish(listing.productId, listing.provider);
    }

    const normalized = await loadAndNormalizeProduct(listing.productId, listing.provider);
    if (!normalized) throw ApiError.notFound('Produto nao encontrado.');

    try {
      const updated = await syncService.pushListing(listing, normalized, true);
      await prisma.marketplaceListing.update({ where: { id }, data: { lastSyncedHash: listingHash(normalized) } });
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
      data: { status: ListingSyncStatus.PAUSED, pausedBySystem: false },
    });
  }

  /** Reativa um anuncio pausado a mao. Sem quantidade a venda, o ML recusaria. */
  async activate(id: string): Promise<MarketplaceListing> {
    const listing = await this.getById(id);
    if (!listing.externalId) throw ApiError.badRequest('Anuncio ainda nao publicado.');
    const normalized = await loadAndNormalizeProduct(listing.productId, listing.provider);
    if (!normalized) throw ApiError.notFound('Produto nao encontrado.');
    if (normalized.stock <= 0) {
      throw ApiError.badRequest('Sem quantidade à venda. Ajuste o estoque ou a regra do produto antes de reativar.');
    }
    // Marca como pausa do sistema: o push reativa e acerta preco/estoque juntos.
    const marked = await prisma.marketplaceListing.update({ where: { id }, data: { pausedBySystem: true } });
    return syncService.pushListing(marked, normalized, true);
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
