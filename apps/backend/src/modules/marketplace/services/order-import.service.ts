import {
  MarketplaceProvider,
  OrderSource,
  OrderStatus,
  OrderItemType,
  Prisma,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { tokenRefreshService } from './token-refresh.service.js';
import { NormalizedOrder } from '../marketplace.types.js';

const PROVIDER_SOURCE: Record<MarketplaceProvider, OrderSource> = {
  [MarketplaceProvider.MERCADO_LIVRE]: OrderSource.MERCADO_LIVRE,
  [MarketplaceProvider.SHOPEE]: OrderSource.SHOPEE,
};

/** Importa pedidos vindos dos marketplaces e mantem o estoque consistente. */
export class OrderImportService {
  /**
   * Importa um pedido do marketplace pelo seu id externo.
   * Idempotente: se o pedido ja foi importado, apenas retorna.
   */
  async importOrder(provider: MarketplaceProvider, externalOrderId: string): Promise<void> {
    const existing = await prisma.order.findUnique({ where: { externalOrderId } });
    if (existing) {
      logger.info('[OrderImport] pedido ja importado', { provider, externalOrderId });
      return;
    }

    const account = await tokenRefreshService.ensureFreshToken(provider);
    const adapter = getAdapter(provider);
    const order = await adapter.fetchOrder(account, externalOrderId);

    await this.persistOrder(provider, order);
  }

  /** Persiste o pedido normalizado, criando customer/address sinteticos quando preciso. */
  private async persistOrder(provider: MarketplaceProvider, order: NormalizedOrder): Promise<void> {
    const customer = await this.ensureMarketplaceCustomer(provider, order);
    const address = await this.ensureAddress(customer.id, order);

    // Casa itens do marketplace com produtos do M2 via MarketplaceListing.externalId ou SKU
    const items = await this.resolveItems(provider, order);

    const subtotal = order.items.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);

    await prisma.$transaction(async tx => {
      const created = await tx.order.create({
        data: {
          customerId: customer.id,
          addressId: address.id,
          status: OrderStatus.CONFIRMED,
          source: PROVIDER_SOURCE[provider],
          externalOrderId: order.externalOrderId,
          externalProvider: provider,
          hasProducts: true,
          hasServices: false,
          subtotal: new Prisma.Decimal(subtotal),
          discountAmount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(order.total || subtotal),
          paymentMethod: order.paymentMethod ?? provider.toLowerCase(),
          items: {
            create: order.items.map((it, idx) => ({
              productId: items[idx]?.productId ?? null,
              type: OrderItemType.PRODUCT,
              name: it.title,
              price: new Prisma.Decimal(it.unitPrice),
              quantity: it.quantity,
              subtotal: new Prisma.Decimal(it.unitPrice * it.quantity),
            })),
          },
        },
      });

      // Decrementa estoque dos produtos casados
      for (let i = 0; i < order.items.length; i++) {
        const productId = items[i]?.productId;
        if (productId) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: order.items[i].quantity } },
          });
        }
      }

      logger.info('[OrderImport] pedido criado', {
        provider,
        externalOrderId: order.externalOrderId,
        orderId: created.id,
      });
    });

    // Propaga o novo estoque para os demais marketplaces (anti-overselling)
    const productIds = items.map(i => i?.productId).filter((id): id is string => Boolean(id));
    if (productIds.length > 0) {
      const { syncService } = await import('./sync.service.js');
      for (const productId of [...new Set(productIds)]) {
        void syncService.syncProduct(productId);
      }
    }
  }

  /** Casa cada item do pedido com um Product do M2. */
  private async resolveItems(
    provider: MarketplaceProvider,
    order: NormalizedOrder
  ): Promise<Array<{ productId: string | null }>> {
    return Promise.all(
      order.items.map(async item => {
        // 1) tenta pelo externalId do anuncio
        if (item.externalItemId) {
          const listing = await prisma.marketplaceListing.findFirst({
            where: { provider, externalId: item.externalItemId },
            select: { productId: true },
          });
          if (listing) return { productId: listing.productId };
        }
        // 2) tenta pelo SKU
        if (item.sku) {
          const product = await prisma.product.findUnique({
            where: { sku: item.sku },
            select: { id: true },
          });
          if (product) return { productId: product.id };
        }
        return { productId: null };
      })
    );
  }

  /** Cria/recupera um Customer "espelho" para o comprador do marketplace. */
  private async ensureMarketplaceCustomer(provider: MarketplaceProvider, order: NormalizedOrder) {
    const slug = provider.toLowerCase();
    const email = order.buyerEmail ?? `${slug}+${order.externalOrderId}@marketplace.local`;

    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return existing;

    return prisma.customer.create({
      data: {
        email,
        // senha aleatoria (conta nao usada para login)
        password: `mp_${Math.random().toString(36).slice(2)}`,
        name: order.buyerName ?? `Comprador ${provider}`,
        phone: order.buyerPhone ?? '00000000000',
      },
    });
  }

  /** Cria um Address a partir do endereco de entrega do pedido. */
  private async ensureAddress(customerId: string, order: NormalizedOrder) {
    const addr = order.shippingAddress;
    return prisma.address.create({
      data: {
        customerId,
        street: addr?.street?.slice(0, 191) || 'Nao informado',
        number: addr?.number || 'S/N',
        complement: addr?.complement ?? null,
        neighborhood: addr?.neighborhood || 'Nao informado',
        city: addr?.city || 'Nao informado',
        state: (addr?.state || 'SP').slice(0, 2).toUpperCase(),
        zipCode: (addr?.zipCode || '00000000').replace(/\D/g, '').padEnd(8, '0').slice(0, 8),
      },
    });
  }
}

export const orderImportService = new OrderImportService();
