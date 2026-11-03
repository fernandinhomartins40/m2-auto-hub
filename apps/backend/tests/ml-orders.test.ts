import { MarketplaceFulfillmentStage as Stage } from '@prisma/client';

jest.mock('../src/config/database.js', () => {
  const model = () => ({ findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), upsert: jest.fn() });
  return { prisma: { marketplaceOrder: model(), order: model(), product: model() } };
});
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../src/modules/marketplace/services/marketplace-notifier.js', () => ({ notifyStore: jest.fn() }));
jest.mock('../src/modules/marketplace/services/token-refresh.service.js', () => ({
  tokenRefreshService: { ensureFreshToken: jest.fn().mockResolvedValue({ accessToken: 't', sellerId: '1' }) },
}));
const adapter = { fetchOrder: jest.fn(), fetchShipment: jest.fn() };
jest.mock('../src/modules/marketplace/adapters/index.js', () => ({ getAdapter: () => adapter }));
jest.mock('../src/modules/marketplace/services/order-import.service.js', () => ({
  orderImportService: { resolveItems: jest.fn(), persistOrder: jest.fn(), cancelOrder: jest.fn() },
}));

import { prisma } from '../src/config/database.js';
import { notifyStore } from '../src/modules/marketplace/services/marketplace-notifier.js';
import { orderImportService } from '../src/modules/marketplace/services/order-import.service.js';
import { mlOrderService } from '../src/modules/marketplace/services/ml-order.service.js';

type Model = Record<string, jest.Mock>;
const db = prisma as unknown as Record<string, Model>;
const imports = orderImportService as unknown as Record<string, jest.Mock>;

const mlOrder = (status: string) => ({
  externalOrderId: '2000001', status, total: 150, buyerNickname: 'COMPRADOR1', createdAt: new Date('2026-11-03T13:00:00Z'),
  shipmentId: '4000001', items: [{ externalItemId: 'MLB1', title: 'Filtro', quantity: 3, unitPrice: 50 }],
});

beforeEach(() => {
  jest.clearAllMocks();
  adapter.fetchShipment.mockResolvedValue({ id: '4000001', status: 'ready_to_ship', substatus: null, logisticType: 'xd_drop_off', trackingNumber: null, dispatchBy: new Date('2026-11-04T21:00:00Z'), orderId: '2000001' });
  db.marketplaceOrder.upsert.mockImplementation(({ create, update }: { create: object; update: object }) => Promise.resolve({ ...create, ...update }));
  db.order.findUnique.mockResolvedValue(null);
  imports.resolveItems.mockResolvedValue([{ productId: 'p1' }]);
  db.product.findMany.mockResolvedValue([{ id: 'p1', stock: 1, supplier: 'METAL LEVE', specifications: { suppliers: [{ name: 'Distribuidora X' }] } }]);
  imports.persistOrder.mockResolvedValue('order-m2');
});

describe('venda do Mercado Livre', () => {
  it('venda paga cria o pedido (reserva o estoque), divide loja/fornecedor e avisa a loja', async () => {
    db.marketplaceOrder.findUnique.mockResolvedValue(null);
    adapter.fetchOrder.mockResolvedValue(mlOrder('paid'));

    const saved = await mlOrderService.sync('2000001');

    expect(imports.persistOrder).toHaveBeenCalledTimes(1);
    expect(saved).toMatchObject({ stage: Stage.AWAITING_SUPPLIER, orderId: 'order-m2', dispatchBy: new Date('2026-11-04T21:00:00Z') });
    expect((saved as { items: unknown[] }).items[0]).toMatchObject({ fromStore: 1, fromSupplier: 2, supplier: 'Distribuidora X' });
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_SALE', 'Nova venda no Mercado Livre', expect.stringContaining('2 un. precisam vir do fornecedor'), expect.anything());
  });

  it('pagamento pendente não reserva estoque nem avisa', async () => {
    db.marketplaceOrder.findUnique.mockResolvedValue(null);
    adapter.fetchOrder.mockResolvedValue(mlOrder('payment_in_process'));
    const saved = await mlOrderService.sync('2000001');
    expect(imports.persistOrder).not.toHaveBeenCalled();
    expect(notifyStore).not.toHaveBeenCalled();
    expect(saved).toMatchObject({ stage: Stage.AWAITING_PAYMENT });
  });

  it('cancelamento devolve o estoque e avisa uma vez', async () => {
    const existing = { stage: Stage.TO_PICK, orderId: 'order-m2', items: [{ productId: 'p1', title: 'Filtro', quantity: 3, fromStore: 3, fromSupplier: 0, supplier: null }] };
    db.marketplaceOrder.findUnique.mockResolvedValue(existing);
    adapter.fetchOrder.mockResolvedValue(mlOrder('cancelled'));

    const saved = await mlOrderService.sync('2000001');
    expect(imports.cancelOrder).toHaveBeenCalledWith('2000001');
    expect(saved).toMatchObject({ stage: Stage.CANCELLED });
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_SALE_CANCELLED', expect.any(String), expect.any(String), expect.anything());

    (notifyStore as jest.Mock).mockClear();
    db.marketplaceOrder.findUnique.mockResolvedValue({ ...existing, stage: Stage.CANCELLED });
    await mlOrderService.sync('2000001');
    expect(notifyStore).not.toHaveBeenCalled();
  });

  it('aviso e conferência ao mesmo tempo não criam o pedido duas vezes', async () => {
    let stored: object | null = null;
    db.marketplaceOrder.findUnique.mockImplementation(() => Promise.resolve(stored));
    db.marketplaceOrder.upsert.mockImplementation(({ create, update }: { create: object; update: object }) => {
      stored = { ...create, ...update };
      return Promise.resolve(stored);
    });
    adapter.fetchOrder.mockResolvedValue(mlOrder('paid'));

    await Promise.all([mlOrderService.sync('2000001'), mlOrderService.sync('2000001')]);
    expect(imports.persistOrder).toHaveBeenCalledTimes(1);
  });
});
