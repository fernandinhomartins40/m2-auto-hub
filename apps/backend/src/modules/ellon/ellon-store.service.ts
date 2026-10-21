import { EllonEntityType, EllonJobStatus, LoyaltyTransactionType, Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { loyaltyService } from '../loyalty/loyalty.service.js';
import { ellonClient } from './ellon.client.js';
import { linkMetadata } from './ellon-export.service.js';
import { movementFields } from './ellon-master-sync.service.js';
import { ellonStockService, isInvoiced } from './ellon-stock.service.js';
import { DAY_MS, Raw, decimal, errorMessage, integer, pick, rows } from './ellon-sync.util.js';

type Entity = 'ORDER' | 'SERVICE_ORDER';
const PRE_ORDER_REF_KEYS = ['numero_prepedido', 'prepedido', 'numero_pedido', 'pedido'];
const ITEM_KEYS = ['itens', 'produtos', 'items', 'Itens'];

export interface PurchaseEntry {
  id: string;
  kind: 'SALE' | 'PRE_ORDER';
  origin: 'site' | 'oficina' | 'loja';
  date: string | null;
  total: number;
  status: string | null;
  cancelled: boolean;
  items: Array<{ name: string; quantity: number; total: number }>;
}

function purchaseItems(payload: Raw) {
  const list = ITEM_KEYS.map(key => payload[key]).find(Array.isArray) as unknown[] | undefined;
  return (list ?? []).flatMap(raw => {
    const item = linkMetadata(raw);
    const name = pick(item, ['descricao', 'produto', 'nome', 'descricao_produto']);
    if (!name) return [];
    return [{ name, quantity: decimal(pick(item, ['quantidade', 'qtd', 'qtde'])), total: decimal(pick(item, ['valor_total', 'total', 'valor', 'vl_total'])) }];
  });
}

/**
 * Recursos de loja que usam a Ellon como fonte: estoque em tempo real no checkout, situação de
 * um pedido, histórico de compras do cliente (site + balcão), relatório de vendas e pontos de
 * fidelidade das compras feitas no balcão.
 */
export class EllonStoreService {
  /**
   * Confere na Ellon, no momento do pedido, se há estoque (menos as reservas do M2) e atualiza o
   * estoque local. Se a Ellon não responder em poucos segundos, a venda segue com o estoque local:
   * a indisponibilidade do ERP não pode derrubar o checkout.
   */
  async verifyStock(items: Array<{ productId?: string | null; quantity: number; name?: string }>): Promise<void> {
    const config = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    if (!config?.enabled || !config.syncProducts || !config.liveStockCheck) return;
    const wanted = new Map<string, number>();
    for (const item of items) if (item.productId) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + item.quantity);
    if (!wanted.size) return;
    const links = await prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.PRODUCT, localId: { in: [...wanted.keys()] } } });
    if (!links.length) return;
    const reserved = await ellonStockService.activeByProduct();

    const checks = await Promise.all(links.map(async link => {
      try {
        const raw = await ellonClient.request<unknown>('GET', `/publico/integracoes/produto/${encodeURIComponent(link.externalId)}`, { fast: true });
        const variants = rows(raw, ['produtos', 'Produtos']);
        const list = variants.length ? variants : raw && typeof raw === 'object' && !Array.isArray(raw) ? [raw as Raw] : [];
        const item = list.find(variant => integer(variant.sequencia) === link.externalSequence) ?? (list.length === 1 ? list[0] : undefined);
        if (!item || item.quantidade === undefined) return null;
        return { link, available: Math.max(0, integer(item.quantidade) - (reserved.get(link.localId) ?? 0)) };
      } catch (error) {
        logger.warn('[Ellon] estoque em tempo real indisponível; usando estoque local', { productId: link.localId, error: errorMessage(error) });
        return null;
      }
    }));

    const shortages: string[] = [];
    for (const check of checks) {
      if (!check) continue;
      const product = await prisma.product.findUnique({ where: { id: check.link.localId }, select: { name: true, status: true } });
      if (!product) continue;
      const keepStatus = product.status === ProductStatus.DISCONTINUED || product.status === ProductStatus.INACTIVE;
      await prisma.product.update({
        where: { id: check.link.localId },
        data: { stock: check.available, ...(!keepStatus && { status: check.available > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK }) },
      });
      if (check.available < (wanted.get(check.link.localId) ?? 0)) shortages.push(`"${product.name}" (disponível: ${check.available})`);
    }
    if (shortages.length) throw ApiError.badRequest(`Estoque insuficiente: ${shortages.join(', ')}.`);
  }

  /** Situação de um pedido/OS na Ellon, para exibir no M2. */
  async status(entity: Entity, localId: string) {
    const [link, job] = await Promise.all([
      prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: entity as EllonEntityType, localId } } }),
      prisma.ellonJob.findUnique({ where: { idempotencyKey: entity === 'ORDER' ? `order:${localId}:v1` : `service-order:${localId}:v1` } }),
    ]);
    const metadata = linkMetadata(link?.metadata);
    return {
      exported: Boolean(link),
      preOrder: link?.externalId ?? null,
      status: (metadata.ellonStatus as string | null) ?? null,
      cancelled: Boolean(metadata.ellonCancelled),
      invoiced: isInvoiced(metadata),
      nfe: metadata.nfe ?? null,
      delivery: metadata.ellonDelivery ?? null,
      divergence: metadata.totalDivergence ?? null,
      cancellationRequestedAt: metadata.cancellationRequestedAt ?? null,
      lastSyncAt: metadata.ellonSyncedAt ?? null,
      job: job ? { status: job.status, lastError: job.lastError, parked: job.status === EllonJobStatus.FAILED && job.nextAttemptAt.getFullYear() >= 9000 } : null,
    };
  }

  /** Dados fiscais públicos da nota de um pedido do cliente (sem XML). */
  async invoicesFor(orderIds: string[]) {
    if (!orderIds.length) return new Map<string, { number: string; series: string; key: string; issuedAt: string }>();
    const links = await prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.ORDER, localId: { in: orderIds } } });
    return new Map(links.flatMap(link => {
      const nfe = linkMetadata(linkMetadata(link.metadata).nfe);
      return typeof nfe.key === 'string' && nfe.key
        ? [[link.localId, { number: String(nfe.number ?? ''), series: String(nfe.series ?? ''), key: nfe.key, issuedAt: String(nfe.issuedAt ?? '') }]]
        : [];
    }));
  }

  /** Compras do cliente feitas no site, na oficina e no balcão (vendas e pré-pedidos da Ellon). */
  async customerHistory(customerId: string): Promise<{ linked: boolean; ellonCustomerId: string | null; purchases: PurchaseEntry[] }> {
    const link = await prisma.ellonEntityLink.findUnique({ where: { entityType_localId: { entityType: EllonEntityType.CUSTOMER, localId: customerId } } });
    if (!link) return { linked: false, ellonCustomerId: null, purchases: [] };

    // Pré-pedidos do cliente direto da Ellon; se ela não responder, usa os já sincronizados.
    try {
      const response = await ellonClient.request<unknown>('GET', `/publico/integracoes/prepedidoscliente/${encodeURIComponent(link.externalId)}`, { fast: true });
      for (const item of rows(response, ['pedidos', 'Pedidos', 'prepedidos'])) {
        const id = pick(item, ['numero', 'numeroPedido', 'numero_pedido']);
        if (!id) continue;
        const normalized = movementFields('PRE_ORDER', { ...item, id_cliente: pick(item, ['id_cliente', 'cliente']) || link.externalId });
        await prisma.ellonSnapshot.upsert({
          where: { type_externalId: { type: 'PRE_ORDER', externalId: id } },
          update: { payload: item as Prisma.InputJsonValue, syncedAt: new Date(), ...normalized },
          create: { type: 'PRE_ORDER', externalId: id, name: `Pré-pedido ${id}`, payload: item as Prisma.InputJsonValue, ...normalized },
        });
      }
    } catch (error) {
      logger.warn('[Ellon] histórico em tempo real indisponível; usando dados sincronizados', { error: errorMessage(error) });
    }

    const [snapshots, orderLinks] = await Promise.all([
      prisma.ellonSnapshot.findMany({
        where: { type: { in: ['SALE', 'PRE_ORDER'] }, customerExternalId: link.externalId },
        orderBy: [{ occurredAt: 'desc' }, { syncedAt: 'desc' }],
        take: 200,
      }),
      prisma.ellonEntityLink.findMany({ where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] } }, select: { entityType: true, externalId: true } }),
    ]);
    const originByPreOrder = new Map(orderLinks.map(item => [item.externalId, item.entityType === EllonEntityType.ORDER ? 'site' as const : 'oficina' as const]));
    const purchases = snapshots.map((snapshot): PurchaseEntry => {
      const payload = linkMetadata(snapshot.payload);
      const preOrder = snapshot.type === 'PRE_ORDER' ? snapshot.externalId : pick(payload, PRE_ORDER_REF_KEYS);
      return {
        id: snapshot.externalId,
        kind: snapshot.type as PurchaseEntry['kind'],
        origin: originByPreOrder.get(preOrder) ?? 'loja',
        date: snapshot.occurredAt?.toISOString() ?? null,
        total: Number(snapshot.amount ?? 0),
        status: pick(payload, ['status', 'situacao', 'status_pedido']) || null,
        cancelled: snapshot.cancelled,
        items: purchaseItems(payload),
      };
    });
    return { linked: true, ellonCustomerId: link.externalId, purchases };
  }

  /** Vendas faturadas de toda a loja (site, oficina e balcão) num período. */
  async salesReport(from: Date, to: Date) {
    const where = { type: 'SALE', occurredAt: { gte: from, lte: to } };
    const [sales, cancelled, undated, sellers, orderLinks] = await Promise.all([
      prisma.ellonSnapshot.findMany({ where: { ...where, cancelled: false }, select: { externalId: true, occurredAt: true, amount: true, payload: true } }),
      prisma.ellonSnapshot.count({ where: { ...where, cancelled: true } }),
      prisma.ellonSnapshot.count({ where: { type: 'SALE', occurredAt: null } }),
      prisma.ellonSnapshot.findMany({ where: { type: 'SELLER' }, select: { externalId: true, name: true } }),
      prisma.ellonEntityLink.findMany({ where: { entityType: { in: [EllonEntityType.ORDER, EllonEntityType.SERVICE_ORDER] } }, select: { entityType: true, externalId: true } }),
    ]);
    const sellerName = new Map(sellers.map(item => [item.externalId, item.name ?? item.externalId]));
    const originByPreOrder = new Map(orderLinks.map(item => [item.externalId, item.entityType === EllonEntityType.ORDER ? 'site' : 'oficina']));

    const byDay = new Map<string, { total: number; count: number }>();
    const byOrigin = new Map<string, { total: number; count: number }>();
    const bySeller = new Map<string, { total: number; count: number }>();
    const byProduct = new Map<string, { quantity: number; total: number }>();
    let total = 0;
    const add = (map: Map<string, { total: number; count: number }>, key: string, value: number) => {
      const current = map.get(key) ?? { total: 0, count: 0 };
      map.set(key, { total: current.total + value, count: current.count + 1 });
    };
    for (const sale of sales) {
      const payload = linkMetadata(sale.payload);
      const amount = Number(sale.amount ?? 0);
      total += amount;
      add(byDay, (sale.occurredAt as Date).toISOString().slice(0, 10), amount);
      add(byOrigin, originByPreOrder.get(pick(payload, PRE_ORDER_REF_KEYS)) ?? 'loja', amount);
      const seller = pick(payload, ['nome_vendedor', 'vendedor', 'id_vendedor']);
      if (seller) add(bySeller, sellerName.get(seller) ?? seller, amount);
      for (const item of purchaseItems(payload)) {
        const current = byProduct.get(item.name) ?? { quantity: 0, total: 0 };
        byProduct.set(item.name, { quantity: current.quantity + item.quantity, total: current.total + item.total });
      }
    }
    const round = (value: number) => Math.round(value * 100) / 100;
    const ranked = (map: Map<string, { total: number; count: number }>) =>
      [...map.entries()].map(([name, value]) => ({ name, total: round(value.total), count: value.count })).sort((a, b) => b.total - a.total);
    return {
      from: from.toISOString(), to: to.toISOString(),
      count: sales.length, total: round(total), averageTicket: sales.length ? round(total / sales.length) : 0,
      cancelled, undated,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, total: round(value.total), count: value.count })),
      byOrigin: ranked(byOrigin),
      bySeller: ranked(bySeller).slice(0, 15),
      topProducts: [...byProduct.entries()].map(([name, value]) => ({ name, quantity: round(value.quantity), total: round(value.total) }))
        .sort((a, b) => b.total - a.total).slice(0, 20),
    };
  }

  /**
   * Pontos de fidelidade para compras do balcão, a partir da data em que a opção foi ligada.
   * Vendas originadas de pedidos do site ficam de fora (já pontuam pelo pedido). Venda cancelada
   * depois de pontuar gera estorno. Idempotente por venda.
   */
  async awardStoreSales(): Promise<{ awarded: number; reversed: number }> {
    const config = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
    if (!config?.loyaltyFromStoreSales || !config.loyaltyStoreSalesSince) return { awarded: 0, reversed: 0 };
    const since = config.loyaltyStoreSalesSince;
    const [sales, siteLinks] = await Promise.all([
      prisma.ellonSnapshot.findMany({
        where: { type: 'SALE', customerExternalId: { not: null }, OR: [{ occurredAt: { gte: since } }, { occurredAt: null, createdAt: { gte: since } }] },
        select: { externalId: true, amount: true, cancelled: true, customerExternalId: true, occurredAt: true, payload: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      prisma.ellonEntityLink.findMany({ where: { entityType: EllonEntityType.ORDER }, select: { externalId: true } }),
    ]);
    const sitePreOrders = new Set(siteLinks.map(link => link.externalId));
    const refs = sales.map(sale => `ellon-sale:${sale.externalId}`);
    const existing = await prisma.loyaltyTransaction.findMany({
      where: { externalRef: { in: refs }, type: { in: [LoyaltyTransactionType.EARN_STORE_SALE, LoyaltyTransactionType.REVERSE_STORE_SALE] } },
      select: { externalRef: true, type: true, points: true, customerId: true },
    });
    const earned = new Map(existing.filter(item => item.type === LoyaltyTransactionType.EARN_STORE_SALE).map(item => [item.externalRef, item]));
    const reversed = new Set(existing.filter(item => item.type === LoyaltyTransactionType.REVERSE_STORE_SALE).map(item => item.externalRef));
    const customerLinks = await prisma.ellonEntityLink.findMany({
      where: { entityType: EllonEntityType.CUSTOMER, externalId: { in: [...new Set(sales.map(sale => sale.customerExternalId as string))] } },
    });
    const customerIdByExternal = new Map(customerLinks.map(link => [link.externalId, link.localId]));
    const customers = await prisma.customer.findMany({ where: { id: { in: customerLinks.map(link => link.localId) } }, select: { id: true, level: true } });
    const levelById = new Map(customers.map(customer => [customer.id, customer.level]));

    const create: Prisma.LoyaltyTransactionCreateManyInput[] = [];
    for (const sale of sales) {
      const ref = `ellon-sale:${sale.externalId}`;
      const previous = earned.get(ref);
      if (previous) {
        if (sale.cancelled && !reversed.has(ref)) {
          create.push({ customerId: previous.customerId, type: LoyaltyTransactionType.REVERSE_STORE_SALE, points: -previous.points, externalRef: ref, description: `Estorno: compra na loja ${sale.externalId} cancelada` });
        }
        continue;
      }
      if (sale.cancelled || sitePreOrders.has(pick(linkMetadata(sale.payload), PRE_ORDER_REF_KEYS))) continue;
      const customerId = customerIdByExternal.get(sale.customerExternalId as string);
      const level = customerId ? levelById.get(customerId) : undefined;
      if (!customerId || !level) continue;
      const points = await loyaltyService.pointsForPurchase(Number(sale.amount ?? 0), level);
      if (points <= 0) continue;
      create.push({
        customerId, type: LoyaltyTransactionType.EARN_STORE_SALE, points, externalRef: ref,
        description: `Pontos da compra na loja ${sale.externalId}`,
        metadata: { source: 'ellon-sale', total: Number(sale.amount ?? 0) },
        ...(sale.occurredAt && { createdAt: sale.occurredAt }),
      });
    }
    if (create.length) await prisma.loyaltyTransaction.createMany({ data: create, skipDuplicates: true });
    return {
      awarded: create.filter(item => item.type === LoyaltyTransactionType.EARN_STORE_SALE).length,
      reversed: create.filter(item => item.type === LoyaltyTransactionType.REVERSE_STORE_SALE).length,
    };
  }
}

export const ellonStoreService = new EllonStoreService();

export const REPORT_MAX_DAYS = 366;
export const reportRange = (from?: string, to?: string) => {
  const end = to ? new Date(`${to}T23:59:59.999-03:00`) : new Date();
  const start = from ? new Date(`${from}T00:00:00-03:00`) : new Date(end.getTime() - 30 * DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw ApiError.badRequest('Período inválido.');
  if (end.getTime() - start.getTime() > REPORT_MAX_DAYS * DAY_MS) throw ApiError.badRequest(`Período máximo de ${REPORT_MAX_DAYS} dias.`);
  return { start, end };
};
