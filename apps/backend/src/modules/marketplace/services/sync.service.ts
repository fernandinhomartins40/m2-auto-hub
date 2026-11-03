import { ListingSyncStatus, MarketplaceConnectionStatus, MarketplaceListing, MarketplaceProvider, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { connectionService } from './connection.service.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { notifyStore } from './marketplace-notifier.js';
import { loadAndNormalizeProduct } from '../mappers/product-normalizer.js';
import { effectiveFields, parseSettings } from '../mappers/publication.js';
import { NormalizedProduct } from '../marketplace.types.js';

const SYNCED: ListingSyncStatus[] = [ListingSyncStatus.PUBLISHED, ListingSyncStatus.OUT_OF_SYNC, ListingSyncStatus.PAUSED];

/** Precisa ir ao marketplace? Mesma regra usada pelo push e pela conferencia em lote. */
export function needsPush(
  listing: Pick<MarketplaceListing, 'status' | 'pausedBySystem' | 'lastSyncedPrice' | 'lastSyncedStock'>,
  price: number,
  quantity: number
): boolean {
  if (listing.status === ListingSyncStatus.OUT_OF_SYNC) return true;
  if (listing.lastSyncedPrice === null || Number(listing.lastSyncedPrice) !== price) return true;
  if (listing.lastSyncedStock !== quantity) return true;
  if (quantity <= 0 && listing.status !== ListingSyncStatus.PAUSED) return true;
  return quantity > 0 && listing.status === ListingSyncStatus.PAUSED && listing.pausedBySystem;
}

/**
 * Propaga mudancas de preco/estoque do M2 para os marketplaces e reconcilia drift.
 * Chamado na edicao do produto, na venda e por um job a cada 2 minutos, que pega
 * as mudancas feitas pelo Ellon, pelo site e pelas OS.
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
    if (!force && !needsPush(listing, normalized.price, normalized.stock)) return listing;

    const account = await tokenRefreshService.ensureFreshToken(listing.provider);
    const adapter = getAdapter(listing.provider);
    const externalId = listing.externalId as string;
    const title = normalized.publication?.title ?? normalized.name;

    if (shouldPause) {
      // Anti-overselling primeiro: a pausa nao pode depender do preco ser aceito.
      await adapter.pauseListing(account, externalId);
    }
    await adapter.updateListing(account, externalId, {
      price: force || priceChanged ? normalized.price : undefined,
      // Pausado nao precisa de quantidade zero: ela volta junto com a reativacao.
      stock: !shouldPause && (force || stockChanged) ? normalized.stock : undefined,
      saleTerms: force ? normalized.publication?.saleTerms : undefined,
    });

    let status: ListingSyncStatus = listing.status === ListingSyncStatus.PAUSED ? ListingSyncStatus.PAUSED : ListingSyncStatus.PUBLISHED;
    let pausedBySystem = listing.pausedBySystem;
    if (shouldPause) {
      status = ListingSyncStatus.PAUSED;
      pausedBySystem = true;
    } else if (shouldActivate && adapter.activateListing) {
      await adapter.activateListing(account, externalId);
      status = ListingSyncStatus.PUBLISHED;
      pausedBySystem = false;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: {
        lastSyncedPrice: new Prisma.Decimal(normalized.price),
        lastSyncedStock: normalized.stock,
        status,
        pausedBySystem,
        lastError: null,
      },
    });

    if (shouldPause) {
      await notifyStore('MARKETPLACE_LISTING_PAUSED', 'Anúncio pausado: sem estoque', `"${title}" saiu do ar no Mercado Livre porque não há unidades à venda. Ele volta sozinho quando o estoque voltar.`, { productId: listing.productId, listingId: listing.id });
    } else if (shouldActivate) {
      await notifyStore('MARKETPLACE_LISTING_REACTIVATED', 'Anúncio reativado', `"${title}" voltou ao ar no Mercado Livre com ${normalized.stock} un. à venda.`, { productId: listing.productId, listingId: listing.id });
    }
    return updated;
  }

  /**
   * Propaga preco/estoque de um produto para todos os anuncios ativos.
   * Seguro para chamar em fire-and-forget (nunca lanca).
   */
  async syncProduct(productId: string): Promise<void> {
    try {
      const listings = await prisma.marketplaceListing.findMany({
        where: { productId, externalId: { not: null }, status: { in: SYNCED } },
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
          // Avisa so na primeira falha; a conferencia segue tentando a cada ciclo.
          if (listing.status !== ListingSyncStatus.OUT_OF_SYNC) {
            await notifyStore('MARKETPLACE_LISTING_ERROR', 'Anúncio sem atualização de estoque', `Não foi possível atualizar um anúncio no Mercado Livre: ${String(err)}. O sistema tenta de novo a cada 2 minutos.`, { productId, listingId: listing.id });
          }
        }
      }
    } catch (err) {
      logger.warn('[Sync] syncProduct erro inesperado', { productId, err: String(err) });
    }
  }

  private reconciling = false;

  /**
   * Conferencia periodica de todos os anuncios publicados. O Ellon, o site e as OS
   * mudam o estoque direto no banco; aqui essas mudancas chegam ao marketplace.
   * Calcula tudo com uma consulta e so chama o marketplace para o que mudou.
   */
  async reconcile(): Promise<void> {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const [listings, connections] = await Promise.all([
        prisma.marketplaceListing.findMany({
          where: { externalId: { not: null }, status: { in: SYNCED } },
          include: { product: { include: { marketplaceProfiles: true } } },
        }),
        prisma.marketplaceConnection.findMany({ select: { provider: true, status: true, settings: true } }),
      ]);
      const settings = new Map(connections.map(conn => [conn.provider, parseSettings(conn.settings)]));
      const connected = new Set(connections.filter(conn => conn.status === MarketplaceConnectionStatus.CONNECTED).map(conn => conn.provider));

      const changed = new Set<string>();
      for (const listing of listings) {
        if (!connected.has(listing.provider)) continue;
        const profile = listing.product.marketplaceProfiles.find(item => item.provider === listing.provider) ?? null;
        const eff = effectiveFields(listing.product, profile, settings.get(listing.provider) ?? parseSettings(null));
        if (needsPush(listing, eff.price, eff.quantity)) changed.add(listing.productId);
      }
      for (const productId of changed) {
        await this.syncProduct(productId);
      }
      if (changed.size > 0) {
        logger.info('[Sync] conferencia enviou mudancas', { products: changed.size, listings: listings.length });
      }
    } finally {
      this.reconciling = false;
    }
  }

  /**
   * Aviso de anuncio vindo do marketplace: espelha no painel o que mudou la
   * (pausa ou encerramento feito direto no Mercado Livre, revisao, reativacao).
   */
  async applyRemoteStatus(provider: MarketplaceProvider, externalId: string): Promise<void> {
    const listing = await prisma.marketplaceListing.findFirst({ where: { provider, externalId } });
    if (!listing) return;
    const adapter = getAdapter(provider);
    if (!adapter.fetchListingStatus) return;
    const account = await tokenRefreshService.ensureFreshToken(provider);
    const remote = await adapter.fetchListingStatus(account, externalId);

    let data: Prisma.MarketplaceListingUpdateInput | null = null;
    let alert: string | null = null;
    if (remote.status === 'closed' && listing.status !== ListingSyncStatus.ERROR) {
      data = { status: ListingSyncStatus.ERROR, lastError: 'Anúncio encerrado no Mercado Livre.' };
      alert = 'foi encerrado no Mercado Livre';
    } else if (remote.status === 'under_review' && listing.status !== ListingSyncStatus.ERROR) {
      data = { status: ListingSyncStatus.ERROR, lastError: `Anúncio em revisão pelo Mercado Livre${remote.subStatus.length ? ` (${remote.subStatus.join(', ')})` : ''}.` };
      alert = 'está em revisão pelo Mercado Livre e não aparece para compradores';
    } else if (remote.status === 'paused' && listing.status === ListingSyncStatus.PUBLISHED) {
      // Pausa por falta de estoque o sistema reativa; pausa feita a mao na conta, nao.
      data = { status: ListingSyncStatus.PAUSED, pausedBySystem: remote.subStatus.includes('out_of_stock') };
    } else if (remote.status === 'active' && (listing.status === ListingSyncStatus.PAUSED || listing.status === ListingSyncStatus.ERROR)) {
      data = { status: ListingSyncStatus.PUBLISHED, pausedBySystem: false, lastError: null };
    }
    if (!data) return;
    await prisma.marketplaceListing.update({ where: { id: listing.id }, data });
    if (alert) {
      await notifyStore('MARKETPLACE_LISTING_ERROR', 'Anúncio fora do ar no Mercado Livre', `O anúncio ${externalId} ${alert}. Confira no painel.`, { productId: listing.productId, listingId: listing.id });
    }
  }
}

export const syncService = new SyncService();
