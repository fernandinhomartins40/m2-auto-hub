import { prisma } from '../src/config/database.js';
import { EllonResponseError, ellonClient } from '../src/modules/ellon/ellon.client.js';
import { EllonStoreService, reportRange } from '../src/modules/ellon/ellon-store.service.js';
import { movementFields } from '../src/modules/ellon/ellon-master-sync.service.js';

jest.mock('../src/config/database.js', () => {
  const model = () => ({
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(),
    updateMany: jest.fn(), upsert: jest.fn(), count: jest.fn(),
  });
  return { prisma: {
    product: model(), ellonEntityLink: model(), ellonConnection: model(), ellonSnapshot: model(), ellonJob: model(),
    customer: model(), order: model(), serviceOrder: model(), loyaltyTransaction: model(), $transaction: jest.fn(),
  } };
});
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../src/modules/ellon/ellon-connection.service.js', () => ({ ellonConnectionService: { getRaw: jest.fn(), credentials: jest.fn() } }));
jest.mock('../src/modules/service-orders/service-orders.service.js', () => ({ serviceOrdersService: { cancel: jest.fn() } }));
jest.mock('../src/modules/loyalty/loyalty.service.js', () => ({
  loyaltyService: { pointsForPurchase: jest.fn(async (total: number) => Math.floor(total)) },
}));

type Model = Record<string, jest.Mock>;
const db = prisma as unknown as Record<string, Model>;
const service = new EllonStoreService();

beforeEach(() => {
  for (const model of Object.values(db)) if (typeof model === 'object') for (const fn of Object.values(model)) fn.mockReset();
  db.ellonConnection.findUnique.mockResolvedValue({ enabled: true, syncProducts: true, liveStockCheck: true, reservationTtlDays: 15 });
  db.order.findMany.mockResolvedValue([]);
  db.serviceOrder.findMany.mockResolvedValue([]);
  db.ellonEntityLink.findMany.mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

describe('normalização de vendas', () => {
  it('extrai data brasileira, valor com vírgula, cliente e cancelamento', () => {
    const fields = movementFields('SALE', { data: '15/10/2026', valor_liquido: '1.234,50', id_cliente: 77, cancelado: 'S' });
    expect(fields.occurredAt?.toISOString().slice(0, 10)).toBe('2026-10-15');
    expect(fields.amount.toNumber()).toBe(1234.5);
    expect(fields.customerExternalId).toBe('77');
    expect(fields.cancelled).toBe(true);
  });
});

describe('estoque em tempo real no checkout', () => {
  const setLinks = () => db.ellonEntityLink.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
    where.entityType === 'PRODUCT' && (where.localId as { in?: string[] })?.in ? [{ localId: 'p1', externalId: '10', externalSequence: 0 }] : []);

  it('recusa o pedido quando a Ellon (menos reservas) não tem quantidade e atualiza o estoque local', async () => {
    setLinks();
    db.product.findUnique.mockResolvedValue({ name: 'Filtro', status: 'ACTIVE' });
    jest.spyOn(ellonClient, 'request').mockResolvedValue([{ id: 10, sequencia: 0, quantidade: '1' }]);
    await expect(service.verifyStock([{ productId: 'p1', quantity: 2 }])).rejects.toThrow(/Filtro.*disponível: 1/);
    expect(db.product.update.mock.calls[0][0].data).toEqual({ stock: 1, status: 'ACTIVE' });
  });

  it('segue com o estoque local se a Ellon não responder', async () => {
    setLinks();
    jest.spyOn(ellonClient, 'request').mockRejectedValue(new Error('timeout'));
    await expect(service.verifyStock([{ productId: 'p1', quantity: 2 }])).resolves.toBeUndefined();
    expect(db.product.update).not.toHaveBeenCalled();
  });

  it('não consulta quando a opção está desligada', async () => {
    db.ellonConnection.findUnique.mockResolvedValue({ enabled: true, syncProducts: true, liveStockCheck: false });
    const request = jest.spyOn(ellonClient, 'request');
    await service.verifyStock([{ productId: 'p1', quantity: 1 }]);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('relatório de vendas', () => {
  it('soma por dia, origem, vendedor e produto, separando canceladas', async () => {
    db.ellonSnapshot.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.type === 'SELLER') return [{ externalId: '3', name: 'Carlos' }];
      return [
        { externalId: 's1', occurredAt: new Date('2026-10-10T12:00:00Z'), amount: 100, payload: { vendedor: '3', itens: [{ descricao: 'Óleo', quantidade: '2', valor_total: '80' }] } },
        { externalId: 's2', occurredAt: new Date('2026-10-10T15:00:00Z'), amount: 50, payload: { numero_prepedido: '900', itens: [{ descricao: 'Óleo', quantidade: '1', valor_total: '40' }] } },
      ];
    });
    db.ellonSnapshot.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    db.ellonEntityLink.findMany.mockResolvedValue([{ entityType: 'ORDER', externalId: '900' }]);
    const report = await service.salesReport(new Date('2026-10-01'), new Date('2026-10-31'));
    expect(report).toMatchObject({ count: 2, total: 150, averageTicket: 75, cancelled: 1 });
    expect(report.byDay).toEqual([{ date: '2026-10-10', total: 150, count: 2 }]);
    expect(report.byOrigin).toEqual([{ name: 'loja', total: 100, count: 1 }, { name: 'site', total: 50, count: 1 }]);
    expect(report.bySeller).toEqual([{ name: 'Carlos', total: 100, count: 1 }]);
    expect(report.topProducts).toEqual([{ name: 'Óleo', quantity: 3, total: 120 }]);
  });

  it('valida o período', () => {
    expect(() => reportRange('2026-10-10', '2026-10-01')).toThrow();
    expect(() => reportRange('2024-01-01', '2026-01-01')).toThrow(/máximo/);
  });
});

describe('fidelidade com compras do balcão', () => {
  it('pontua venda do balcão, ignora venda vinda do site e estorna venda cancelada', async () => {
    const since = new Date('2026-10-01');
    db.ellonConnection.findUnique.mockResolvedValue({ loyaltyFromStoreSales: true, loyaltyStoreSalesSince: since });
    db.ellonSnapshot.findMany.mockResolvedValue([
      { externalId: 'loja1', amount: 120, cancelled: false, customerExternalId: '7', occurredAt: new Date('2026-10-05'), payload: {} },
      { externalId: 'site1', amount: 300, cancelled: false, customerExternalId: '7', occurredAt: new Date('2026-10-05'), payload: { numero_prepedido: '900' } },
      { externalId: 'cancelada', amount: 50, cancelled: true, customerExternalId: '7', occurredAt: new Date('2026-10-06'), payload: {} },
    ]);
    db.ellonEntityLink.findMany.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      where.entityType === 'ORDER' ? [{ externalId: '900' }] : [{ externalId: '7', localId: 'c1' }]);
    db.loyaltyTransaction.findMany.mockResolvedValue([{ externalRef: 'ellon-sale:cancelada', type: 'EARN_STORE_SALE', points: 50, customerId: 'c1' }]);
    db.customer.findMany.mockResolvedValue([{ id: 'c1', level: 'BRONZE' }]);
    const result = await service.awardStoreSales();
    const data = db.loyaltyTransaction.createMany.mock.calls[0][0].data;
    expect(data).toEqual([
      expect.objectContaining({ customerId: 'c1', type: 'EARN_STORE_SALE', points: 120, externalRef: 'ellon-sale:loja1' }),
      expect.objectContaining({ customerId: 'c1', type: 'REVERSE_STORE_SALE', points: -50, externalRef: 'ellon-sale:cancelada' }),
    ]);
    expect(result).toEqual({ awarded: 1, reversed: 1 });
  });

  it('não faz nada com a opção desligada', async () => {
    db.ellonConnection.findUnique.mockResolvedValue({ loyaltyFromStoreSales: false });
    await expect(service.awardStoreSales()).resolves.toEqual({ awarded: 0, reversed: 0 });
    expect(db.loyaltyTransaction.createMany).not.toHaveBeenCalled();
  });
});

describe('histórico de compras do cliente', () => {
  it('junta pré-pedidos e vendas, marcando a origem', async () => {
    db.ellonEntityLink.findUnique.mockResolvedValue({ externalId: '7' });
    jest.spyOn(ellonClient, 'request').mockRejectedValue(new EllonResponseError(404, 'Nenhum pedido'));
    db.ellonSnapshot.findMany.mockResolvedValue([
      { type: 'SALE', externalId: 'v1', occurredAt: new Date('2026-10-05'), amount: 80, cancelled: false, payload: { itens: [{ descricao: 'Pastilha', quantidade: 1, valor_total: 80 }] } },
      { type: 'PRE_ORDER', externalId: '900', occurredAt: null, amount: 50, cancelled: false, payload: { status: 'ABERTO' } },
    ]);
    db.ellonEntityLink.findMany.mockResolvedValue([{ entityType: 'SERVICE_ORDER', externalId: '900' }]);
    const history = await service.customerHistory('c1');
    expect(history.linked).toBe(true);
    expect(history.purchases).toEqual([
      expect.objectContaining({ id: 'v1', kind: 'SALE', origin: 'loja', total: 80, items: [{ name: 'Pastilha', quantity: 1, total: 80 }] }),
      expect.objectContaining({ id: '900', kind: 'PRE_ORDER', origin: 'oficina', status: 'ABERTO' }),
    ]);
  });

  it('cliente sem vínculo com a Ellon não tem histórico externo', async () => {
    db.ellonEntityLink.findUnique.mockResolvedValue(null);
    await expect(service.customerHistory('c1')).resolves.toEqual({ linked: false, ellonCustomerId: null, purchases: [] });
  });
});
