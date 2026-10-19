import { prisma } from '../src/config/database.js';
import { ellonClient } from '../src/modules/ellon/ellon.client.js';
import { EllonExportService, observation, paymentCode } from '../src/modules/ellon/ellon-export.service.js';
import { EllonStockService } from '../src/modules/ellon/ellon-stock.service.js';
import { EllonCancellationService } from '../src/modules/ellon/ellon-cancellation.service.js';
import { divergenceOf } from '../src/modules/ellon/ellon-master-sync.service.js';
import { validDocument } from '../src/modules/ellon/ellon-sync.util.js';

jest.mock('../src/config/database.js', () => {
  const model = () => ({
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    updateMany: jest.fn(), upsert: jest.fn(), count: jest.fn(),
  });
  return { prisma: {
    product: model(), ellonEntityLink: model(), ellonConnection: model(), ellonSnapshot: model(), ellonJob: model(),
    customer: model(), order: model(), serviceOrder: model(), $transaction: jest.fn(),
  } };
});
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../src/modules/service-orders/service-orders.service.js', () => ({ serviceOrdersService: { cancel: jest.fn() } }));
jest.mock('../src/modules/ellon/ellon-connection.service.js', () => ({
  ellonConnectionService: { getRaw: jest.fn(), credentials: jest.fn(), saveToken: jest.fn(), markError: jest.fn() },
}));

import { ellonConnectionService } from '../src/modules/ellon/ellon-connection.service.js';

type Model = Record<string, jest.Mock>;
const db = prisma as unknown as Record<string, Model> & { $transaction: jest.Mock };
const config = {
  enabled: true, companyCode: 2, transactionCode: 1, costCenterCode: 1, sellerCode: 3, warehouseCode: 1, paymentMethodCode: 9,
  carrierCode: null, serviceItemTypes: [] as string[], defaultCustomerCode: null as number | null, exportOrderSources: ['WEB'],
  paymentMethodMap: null as unknown, stockIncludesPreOrders: false, reservationTtlDays: 15,
};

beforeEach(() => {
  for (const model of Object.values(db)) if (typeof model === 'object') for (const fn of Object.values(model)) fn.mockReset();
  db.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db));
  (ellonConnectionService.getRaw as jest.Mock).mockResolvedValue({ ...config });
  db.ellonConnection.findUnique.mockResolvedValue({ ...config });
  db.ellonEntityLink.findMany.mockResolvedValue([]);
});
afterEach(() => jest.restoreAllMocks());

describe('utilitários', () => {
  it('valida CPF/CNPJ pelos dígitos verificadores', () => {
    expect(validDocument('529.982.247-25')).toBe(true);
    expect(validDocument('11.222.333/0001-81')).toBe(true);
    expect(validDocument('529.982.247-24')).toBe(false);
    expect(validDocument('111.111.111-11')).toBe(false);
  });

  it('mapeia forma de pagamento sem diferenciar maiúsculas e ignora códigos inválidos', () => {
    expect(paymentCode({ PIX: 4, cartao: 0 }, 'pix')).toBe(4);
    expect(paymentCode({ cartao: 0 }, 'cartao')).toBeNull();
    expect(paymentCode(null, 'pix')).toBeNull();
  });

  it('limita a observação e descarta partes vazias', () => {
    expect(observation(['a', '', 'b'])).toBe('a | b');
    expect(observation(['x'.repeat(2000)])).toHaveLength(1000);
  });

  it('só aponta divergência de total acima de R$ 0,05', () => {
    expect(divergenceOf(100, '100,04')).toBeNull();
    expect(divergenceOf(100, '120,00')).toEqual({ m2Total: 100, ellonTotal: 120, difference: 20 });
    expect(divergenceOf(undefined, '120')).toBeNull();
  });
});

describe('reservas de estoque', () => {
  const service = new EllonStockService();

  it('reserva saídas do M2 ainda não faturadas na Ellon e ignora as faturadas e as antigas', async () => {
    const recent = new Date();
    const old = new Date(Date.now() - 20 * 86_400_000);
    db.order.findMany.mockResolvedValue([
      { id: 'o1', createdAt: recent, items: [{ productId: 'p1', name: 'Filtro', quantity: 2 }] },
      { id: 'o2', createdAt: recent, items: [{ productId: 'p1', name: 'Filtro', quantity: 5 }] },
      { id: 'o3', createdAt: old, items: [{ productId: 'p1', name: 'Filtro', quantity: 7 }] },
    ]);
    db.serviceOrder.findMany.mockResolvedValue([{ id: 's1', number: 10, completedAt: recent, items: [{ productId: 'p2', name: 'Óleo', quantity: 1 }, { productId: 'local', name: 'Peça sem Ellon', quantity: 1 }] }]);
    db.ellonEntityLink.findMany
      .mockResolvedValueOnce([{ localId: 'p1' }, { localId: 'p2' }])
      .mockResolvedValueOnce([{ entityType: 'ORDER', localId: 'o2', externalId: '99', metadata: { nfe: { key: 'x' } } }]);
    const totals = await service.activeByProduct();
    expect(Object.fromEntries(totals)).toEqual({ p1: 2, p2: 1 });
  });

  it('não subtrai de novo o que já foi enviado quando a Ellon desconta pré-pedidos', async () => {
    db.ellonConnection.findUnique.mockResolvedValue({ ...config, stockIncludesPreOrders: true });
    db.order.findMany.mockResolvedValue([
      { id: 'o1', createdAt: new Date(), items: [{ productId: 'p1', name: 'A', quantity: 2 }] },
      { id: 'o2', createdAt: new Date(), items: [{ productId: 'p1', name: 'A', quantity: 3 }] },
    ]);
    db.serviceOrder.findMany.mockResolvedValue([]);
    db.ellonEntityLink.findMany
      .mockResolvedValueOnce([{ localId: 'p1' }])
      .mockResolvedValueOnce([{ entityType: 'ORDER', localId: 'o2', externalId: '99', metadata: {} }]);
    expect((await service.activeByProduct()).get('p1')).toBe(2);
  });
});

describe('pré-validação e envio de OS', () => {
  const service = new EllonExportService();
  const os = (overrides: Record<string, unknown> = {}) => ({
    id: 'os1', number: 15, status: 'COMPLETED', customerId: null, customerName: 'João', customerPhone: '11999', vehicleLabel: 'Gol', vehiclePlate: 'ABC1D23',
    mileage: 50000, mechanicName: 'Zé', revisionId: null, laborTotal: 150, partsTotal: 50, discount: 20, total: 180,
    items: [
      { id: 'i1', type: 'SERVICE', serviceId: 'svc', productId: null, name: 'Troca de óleo', quantity: 1, unitPrice: 150 },
      { id: 'i2', type: 'PRODUCT', serviceId: null, productId: 'p1', name: 'Filtro', quantity: 1, unitPrice: 50 },
    ],
    ...overrides,
  });
  const links = [
    { entityType: 'SERVICE', localId: 'svc', externalId: '500', externalSequence: 0 },
    { entityType: 'PRODUCT', localId: 'p1', externalId: '10', externalSequence: 0 },
  ];

  it('bloqueia OS avulsa sem cliente consumidor final configurado', async () => {
    db.serviceOrder.findUnique.mockResolvedValue(os());
    db.ellonEntityLink.findMany.mockResolvedValue(links);
    const check = await service.preflightServiceOrder('os1');
    expect(check.ready).toBe(false);
    expect(check.customerProblem).toMatch(/consumidor final/);
  });

  it('bloqueia mão de obra vinculada a item Ellon que não é de serviço', async () => {
    (ellonConnectionService.getRaw as jest.Mock).mockResolvedValue({ ...config, serviceItemTypes: ['S'], defaultCustomerCode: 1 });
    db.serviceOrder.findUnique.mockResolvedValue(os());
    db.ellonEntityLink.findMany.mockResolvedValue(links);
    db.ellonEntityLink.findUnique.mockResolvedValue({ localId: 'ellon-prod-500' });
    db.product.findUnique.mockResolvedValue({ specifications: { type: 'P' } });
    const check = await service.preflightServiceOrder('os1');
    expect(check.ready).toBe(false);
    expect(check.fiscalIssues[0].message).toMatch(/tipo "P"/);
  });

  it('envia OS avulsa com consumidor final e leva valores aprovados na observação', async () => {
    (ellonConnectionService.getRaw as jest.Mock).mockResolvedValue({ ...config, defaultCustomerCode: 777 });
    db.serviceOrder.findUnique.mockResolvedValue(os());
    db.ellonEntityLink.findMany.mockResolvedValue(links);
    const request = jest.spyOn(ellonClient, 'request').mockResolvedValue({ numeroPedido: 321 });
    await service.exportServiceOrder('os1');
    const body = request.mock.calls[0][2]?.body as Record<string, unknown>;
    expect(body.id_cliente).toBe(777);
    expect(body.itens).toEqual([{ id_produto: 500, id_sequencia: 0, quantidade: 1 }, { id_produto: 10, id_sequencia: 0, quantidade: 1 }]);
    expect(body.observacao).toMatch(/OS M2 nº 15/);
    expect(body.observacao).toMatch(/Cliente: João/);
    expect(body.observacao).toMatch(/Desconto R\$ 20,00/);
    expect(body.observacao).toMatch(/Total aprovado R\$ 180,00/);
    expect(db.ellonEntityLink.upsert.mock.calls[0][0].create.metadata).toMatchObject({ m2Total: 180 });
  });

  it('não exporta pedido de origem desabilitada (marketplace)', async () => {
    db.order.findUnique.mockResolvedValue({ id: 'o1', status: 'CONFIRMED', source: 'MERCADO_LIVRE', items: [{ id: 'x' }] });
    await expect(service.enqueueOrder('o1')).rejects.toThrow(/MERCADO_LIVRE/);
  });
});

describe('cancelamento com pré-pedido existente', () => {
  const service = new EllonCancellationService();

  it('bloqueia cancelamento local e registra solicitação', async () => {
    const link = { id: 'l', externalId: '321', metadata: {} };
    db.ellonEntityLink.findUnique.mockResolvedValue(link);
    db.ellonJob.findUnique.mockResolvedValue(null);
    await expect(service.assertLocalCancelAllowed('ORDER', 'o1')).rejects.toThrow(/Solicitar cancelamento/);
    await expect(service.request('ORDER', 'o1', 'admin')).resolves.toEqual({ status: 'REQUESTED', preOrder: '321' });
    expect(db.ellonEntityLink.update.mock.calls[0][0].data.metadata).toMatchObject({ cancellationRequestedBy: 'admin' });
  });

  it('descarta envio ainda não feito ao cancelar localmente', async () => {
    db.ellonEntityLink.findUnique.mockResolvedValue(null);
    db.ellonJob.findUnique.mockResolvedValue({ id: 'j', status: 'PENDING', nextAttemptAt: new Date() });
    await service.assertLocalCancelAllowed('ORDER', 'o1');
    expect(db.ellonJob.update.mock.calls[0][0].data.status).toBe('CANCELLED');
  });

  it('bloqueia quando o envio terminou sem confirmação', async () => {
    db.ellonEntityLink.findUnique.mockResolvedValue(null);
    db.ellonJob.findUnique.mockResolvedValue({ id: 'j', status: 'FAILED', nextAttemptAt: new Date('9999-12-31') });
    await expect(service.assertLocalCancelAllowed('SERVICE_ORDER', 's1')).rejects.toThrow(/sem confirmação/);
  });

  it('recusa cancelamento de pré-pedido já faturado', async () => {
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'l', externalId: '321', metadata: { nfe: { key: 'k' } } });
    await expect(service.request('ORDER', 'o1')).rejects.toThrow(/faturado/);
  });
});
