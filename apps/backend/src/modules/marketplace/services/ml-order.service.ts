import {
  MarketplaceFulfillmentStage as Stage,
  MarketplaceOrder,
  MarketplaceProvider,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { logger } from '@shared/utils/logger.util.js';
import { getAdapter } from '../adapters/index.js';
import { MercadoLivreAdapter } from '../adapters/mercado-livre.adapter.js';
import { AllocatedItem, allocate, isOpen, needsSupplier, nextStage } from '../mappers/fulfillment.js';
import { NormalizedShipment } from '../marketplace.types.js';
import { notifyStore } from './marketplace-notifier.js';
import { orderImportService } from './order-import.service.js';
import { tokenRefreshService } from './token-refresh.service.js';

const PROVIDER = MarketplaceProvider.MERCADO_LIVRE;
/** Pedido pago: e quando a venda reserva estoque e entra na fila de despacho. */
const PAID = new Set(['paid', 'partially_refunded']);
const RECENT_DAYS = 3;
const SLA_ALERT_MS = 3 * 60 * 60 * 1000;

export type StageAction = 'SUPPLIER_RECEIVED' | 'PICKED' | 'BACK_TO_PICK';

function adapter(): MercadoLivreAdapter {
  return getAdapter(PROVIDER) as MercadoLivreAdapter;
}

function storedItems(order: MarketplaceOrder | null): AllocatedItem[] {
  return Array.isArray(order?.items) ? order.items as unknown as AllocatedItem[] : [];
}

function supplierName(specifications: unknown, fallback: string): string | null {
  const specs = specifications && typeof specifications === 'object' ? specifications as Record<string, unknown> : {};
  const suppliers = Array.isArray(specs.suppliers) ? specs.suppliers as Array<Record<string, unknown>> : [];
  const name = typeof suppliers[0]?.name === 'string' ? suppliers[0].name.trim() : '';
  return name || (fallback && fallback !== 'Ellon' ? fallback : null);
}

/**
 * Vendas do Mercado Livre: cada aviso (pedido ou envio) chama `sync`, que e
 * idempotente. A venda paga cria o pedido no M2 (o que reserva o estoque), e o
 * painel acompanha a separacao ate o envio.
 */
export class MlOrderService {
  private inflight = new Map<string, Promise<MarketplaceOrder>>();

  /**
   * Busca pedido e envio no ML e atualiza o acompanhamento. Chamadas da mesma
   * venda (aviso + conferencia do job) rodam em fila, para o pedido do M2 nao
   * ser criado duas vezes.
   */
  sync(externalOrderId: string): Promise<MarketplaceOrder> {
    const previous = this.inflight.get(externalOrderId) ?? Promise.resolve(null);
    const next = previous.catch(() => null).then(() => this.syncNow(externalOrderId));
    this.inflight.set(externalOrderId, next);
    void next.catch(() => undefined).finally(() => {
      if (this.inflight.get(externalOrderId) === next) this.inflight.delete(externalOrderId);
    });
    return next;
  }

  private async syncNow(externalOrderId: string): Promise<MarketplaceOrder> {
    const account = await tokenRefreshService.ensureFreshToken(PROVIDER);
    const order = await adapter().fetchOrder(account, externalOrderId);
    const shipment: NormalizedShipment | null = order.shipmentId
      ? await adapter().fetchShipment(account, order.shipmentId).catch(err => {
        logger.warn('[MlOrder] falha ao consultar envio', { externalOrderId, err: String(err) });
        return null;
      })
      : null;

    const existing = await prisma.marketplaceOrder.findUnique({
      where: { provider_externalOrderId: { provider: PROVIDER, externalOrderId } },
    });

    let items = storedItems(existing);
    let orderId = existing?.orderId ?? null;
    let newSale = false;
    const resolved = items.length === 0 || (!orderId && PAID.has(order.status))
      ? await orderImportService.resolveItems(PROVIDER, order)
      : null;

    if (resolved) {
      // Divide com o estoque de antes da baixa: o que faltar vem do fornecedor.
      const ids = resolved.map(item => item.productId).filter((id): id is string => Boolean(id));
      const products = ids.length
        ? await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true, supplier: true, specifications: true } })
        : [];
      items = allocate(
        order.items.map((item, i) => ({ productId: resolved[i]?.productId ?? null, title: item.title, quantity: item.quantity })),
        new Map(products.map(p => [p.id, p.stock])),
        new Map(products.map(p => [p.id, supplierName(p.specifications, p.supplier)]))
      );
    }

    if (!orderId && PAID.has(order.status)) {
      // Pode existir de uma importacao antiga (antes do painel).
      const legacy = await prisma.order.findUnique({ where: { externalOrderId }, select: { id: true } });
      orderId = legacy?.id ?? await orderImportService.persistOrder(PROVIDER, order, resolved ?? undefined);
      newSale = !legacy;
    }

    const supplierPending = needsSupplier(items) && !existing?.supplierReceivedAt;
    const stage = nextStage(existing?.stage ?? null, order.status, shipment?.status ?? null, supplierPending);
    const now = new Date();

    if (stage === Stage.CANCELLED && existing?.stage !== Stage.CANCELLED && orderId) {
      await orderImportService.cancelOrder(externalOrderId);
      await this.notify('MARKETPLACE_SALE_CANCELLED', 'Venda cancelada no Mercado Livre', `A venda ${externalOrderId} foi cancelada. O estoque foi devolvido.`, externalOrderId);
    }
    if (orderId && (stage === Stage.SHIPPED || stage === Stage.DELIVERED)) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: stage === Stage.DELIVERED ? OrderStatus.DELIVERED : OrderStatus.SHIPPED,
          trackingCode: shipment?.trackingNumber ?? undefined,
          deliveredAt: stage === Stage.DELIVERED ? now : undefined,
        },
      }).catch(err => logger.warn('[MlOrder] falha ao atualizar pedido do M2', { orderId, err: String(err) }));
    }

    const stamp = (target: Stage, current: Date | null | undefined) => (stage === target ? current ?? now : current ?? null);
    const data = {
      packId: order.packId ?? null,
      orderId,
      status: order.status,
      stage,
      buyerNickname: order.buyerNickname ?? order.buyerName ?? null,
      total: new Prisma.Decimal(order.total),
      items: items as unknown as Prisma.InputJsonValue,
      shipmentId: order.shipmentId ?? null,
      shipmentStatus: shipment?.status ?? existing?.shipmentStatus ?? null,
      shipmentSubstatus: shipment?.substatus ?? null,
      logisticType: shipment?.logisticType ?? existing?.logisticType ?? null,
      trackingNumber: shipment?.trackingNumber ?? existing?.trackingNumber ?? null,
      dispatchBy: shipment?.dispatchBy ?? existing?.dispatchBy ?? null,
      shippedAt: stamp(Stage.SHIPPED, existing?.shippedAt),
      deliveredAt: stamp(Stage.DELIVERED, existing?.deliveredAt),
      cancelledAt: stamp(Stage.CANCELLED, existing?.cancelledAt),
      soldAt: order.createdAt ?? existing?.soldAt ?? null,
    };
    const saved = await prisma.marketplaceOrder.upsert({
      where: { provider_externalOrderId: { provider: PROVIDER, externalOrderId } },
      update: data,
      create: { ...data, provider: PROVIDER, externalOrderId },
    });

    if (newSale) {
      const units = items.reduce((sum, item) => sum + item.quantity, 0);
      const fromSupplier = items.reduce((sum, item) => sum + item.fromSupplier, 0);
      await this.notify(
        'MARKETPLACE_SALE',
        'Nova venda no Mercado Livre',
        fromSupplier > 0
          ? `${units} un. vendida(s). ${fromSupplier} un. precisam vir do fornecedor.`
          : `${units} un. vendida(s), tudo em estoque. Separe para despacho.`,
        externalOrderId
      );
    }
    return saved;
  }

  /** Aviso de envio: acha a venda pelo envio e sincroniza a venda inteira. */
  async syncShipment(shipmentId: string): Promise<void> {
    const known = await prisma.marketplaceOrder.findFirst({ where: { provider: PROVIDER, shipmentId } });
    if (known) {
      await this.sync(known.externalOrderId);
      return;
    }
    const account = await tokenRefreshService.ensureFreshToken(PROVIDER);
    const shipment = await adapter().fetchShipment(account, shipmentId);
    if (shipment.orderId) await this.sync(shipment.orderId);
  }

  /**
   * Rede de seguranca do job: busca vendas recentes (aviso perdido) e atualiza
   * as que ainda estao em andamento.
   */
  async pollRecent(): Promise<void> {
    const account = await tokenRefreshService.ensureFreshToken(PROVIDER).catch(() => null);
    if (!account) return;
    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
    const recent = await adapter().searchRecentOrders(account, since).catch(err => {
      logger.warn('[MlOrder] falha ao buscar vendas recentes', { err: String(err) });
      return [] as string[];
    });
    const open = await prisma.marketplaceOrder.findMany({
      where: { provider: PROVIDER, stage: { notIn: [Stage.DELIVERED, Stage.CANCELLED] } },
      select: { externalOrderId: true },
      take: 100,
    });
    const known = new Set((await prisma.marketplaceOrder.findMany({
      where: { provider: PROVIDER, externalOrderId: { in: recent } },
      select: { externalOrderId: true },
    })).map(order => order.externalOrderId));

    const ids = new Set([...recent.filter(id => !known.has(id)), ...open.map(order => order.externalOrderId)]);
    for (const id of ids) {
      await this.sync(id).catch(err => logger.warn('[MlOrder] falha ao sincronizar venda', { id, err: String(err) }));
    }
    await this.alertSla();
  }

  /** Avisa uma vez quando falta pouco para o prazo de despacho de uma venda aberta. */
  async alertSla(): Promise<void> {
    const due = await prisma.marketplaceOrder.findMany({
      where: {
        provider: PROVIDER,
        stage: { in: [Stage.AWAITING_SUPPLIER, Stage.TO_PICK, Stage.READY_TO_SHIP] },
        slaAlertedAt: null,
        dispatchBy: { lte: new Date(Date.now() + SLA_ALERT_MS) },
      },
    });
    for (const order of due) {
      const when = order.dispatchBy?.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) ?? '';
      await this.notify('MARKETPLACE_DISPATCH_DUE', 'Prazo de despacho perto de vencer', `A venda ${order.externalOrderId} precisa ser despachada até ${when}.`, order.externalOrderId);
      await prisma.marketplaceOrder.update({ where: { id: order.id }, data: { slaAlertedAt: new Date() } });
    }
  }

  private notify(type: Parameters<typeof notifyStore>[0], title: string, message: string, externalOrderId: string): Promise<void> {
    return notifyStore(type, title, message, { externalOrderId, source: 'MERCADO_LIVRE' });
  }

  // --- Painel ---

  async list(stage?: Stage | 'OPEN' | 'ALL', page = 1, pageSize = 25) {
    const where: Prisma.MarketplaceOrderWhereInput = { provider: PROVIDER };
    if (stage === 'OPEN') where.stage = { in: [Stage.AWAITING_SUPPLIER, Stage.TO_PICK, Stage.READY_TO_SHIP] };
    else if (stage && stage !== 'ALL') where.stage = stage;

    const [orders, total, grouped, waiting] = await Promise.all([
      prisma.marketplaceOrder.findMany({
        where,
        // Abertas primeiro pelo prazo; as demais pelas mais recentes.
        orderBy: stage === 'OPEN' ? [{ dispatchBy: 'asc' }, { soldAt: 'asc' }] : [{ soldAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.marketplaceOrder.count({ where }),
      prisma.marketplaceOrder.groupBy({ by: ['stage'], where: { provider: PROVIDER }, _count: true }),
      prisma.marketplaceOrder.findMany({ where: { provider: PROVIDER, stage: Stage.AWAITING_SUPPLIER } }),
    ]);

    const counts: Record<string, number> = Object.fromEntries(Object.values(Stage).map(value => [value, 0]));
    for (const row of grouped) counts[row.stage] = row._count;
    counts.OPEN = counts.AWAITING_SUPPLIER + counts.TO_PICK + counts.READY_TO_SHIP;
    counts.ALL = Object.values(Stage).reduce((sum, value) => sum + counts[value], 0);

    // Lista de compras do dia: o que pedir a cada fornecedor.
    const needs = new Map<string, { supplier: string; items: Map<string, { title: string; quantity: number }> }>();
    for (const order of waiting) {
      for (const item of storedItems(order)) {
        if (item.fromSupplier <= 0) continue;
        const supplier = item.supplier ?? 'Fornecedor não informado';
        const group = needs.get(supplier) ?? { supplier, items: new Map() };
        const key = item.productId ?? item.title;
        const line = group.items.get(key) ?? { title: item.title, quantity: 0 };
        line.quantity += item.fromSupplier;
        group.items.set(key, line);
        needs.set(supplier, group);
      }
    }

    return {
      items: orders.map(order => ({ ...order, total: Number(order.total), items: storedItems(order), open: isOpen(order.stage) })),
      total,
      page,
      pageSize,
      counts,
      supplierNeeds: [...needs.values()].map(group => ({ supplier: group.supplier, items: [...group.items.values()] })),
    };
  }

  private async getOrThrow(id: string): Promise<MarketplaceOrder> {
    const order = await prisma.marketplaceOrder.findUnique({ where: { id } });
    if (!order) throw ApiError.notFound('Venda não encontrada.');
    return order;
  }

  /** Etapas que so o lojista conhece: mercadoria chegou, pacote separado. */
  async move(id: string, action: StageAction): Promise<MarketplaceOrder> {
    const order = await this.getOrThrow(id);
    if (!isOpen(order.stage)) throw ApiError.badRequest('Esta venda já saiu da loja.');
    const now = new Date();
    if (action === 'SUPPLIER_RECEIVED') {
      return prisma.marketplaceOrder.update({ where: { id }, data: { supplierReceivedAt: now, stage: Stage.TO_PICK } });
    }
    if (action === 'PICKED') {
      if (order.stage === Stage.AWAITING_SUPPLIER) throw ApiError.badRequest('Marque primeiro que a mercadoria do fornecedor chegou.');
      return prisma.marketplaceOrder.update({ where: { id }, data: { pickedAt: now, stage: Stage.READY_TO_SHIP } });
    }
    return prisma.marketplaceOrder.update({ where: { id }, data: { pickedAt: null, stage: Stage.TO_PICK } });
  }

  async refresh(id: string): Promise<MarketplaceOrder> {
    const order = await this.getOrThrow(id);
    return this.sync(order.externalOrderId);
  }

  /** PDF da etiqueta. Baixar a etiqueta marca o pacote como separado. */
  async label(id: string): Promise<{ pdf: Buffer; filename: string }> {
    const order = await this.getOrThrow(id);
    if (!order.shipmentId) throw ApiError.badRequest('Esta venda não tem envio pelo Mercado Livre.');
    const account = await tokenRefreshService.ensureFreshToken(PROVIDER);
    const pdf = await adapter().downloadLabel(account, order.shipmentId);
    await prisma.marketplaceOrder.update({
      where: { id },
      data: {
        labelPrintedAt: new Date(),
        ...(order.stage === Stage.TO_PICK && { stage: Stage.READY_TO_SHIP, pickedAt: order.pickedAt ?? new Date() }),
      },
    });
    return { pdf, filename: `etiqueta-${order.externalOrderId}.pdf` };
  }
}

export const mlOrderService = new MlOrderService();
