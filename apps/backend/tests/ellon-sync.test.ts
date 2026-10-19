import { prisma } from '../src/config/database.js';
import { AmbiguousEllonError, EllonClient, ellonClient } from '../src/modules/ellon/ellon.client.js';
import { EllonProductSyncService, normalizedProduct } from '../src/modules/ellon/ellon-product-sync.service.js';
import { EllonMasterSyncService } from '../src/modules/ellon/ellon-master-sync.service.js';
import { EllonExportService, customerPayload } from '../src/modules/ellon/ellon-export.service.js';
import { localDate } from '../src/modules/ellon/ellon-sync.util.js';

jest.mock('../src/config/database.js', () => {
  const model = () => ({
    findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(),
    update: jest.fn(), updateMany: jest.fn(), upsert: jest.fn(), delete: jest.fn(), count: jest.fn(),
  });
  return { prisma: {
    product: model(), productCategory: model(), ellonEntityLink: model(), ellonConnection: model(), ellonSnapshot: model(),
    ellonJob: model(), customer: model(), address: model(), order: model(), serviceOrder: model(),
    $transaction: jest.fn(),
  } };
});
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../src/modules/ellon/ellon-connection.service.js', () => ({
  ellonConnectionService: {
    credentials: jest.fn().mockResolvedValue({
      baseUrl: 'http://fvendas.ellon.inf.br:9047', companyCode: 2, username: 'u', integrationCode: 'c', password: 'p',
      accessHash: 'h', bearerToken: 'token', bearerTokenExpiresAt: new Date(Date.now() + 3_600_000),
    }),
    saveToken: jest.fn(), markError: jest.fn(), getRaw: jest.fn(),
  },
}));

type Model = Record<string, jest.Mock>;
const db = prisma as unknown as Record<string, Model> & { $transaction: jest.Mock };
const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  for (const model of Object.values(db)) if (typeof model === 'object') for (const fn of Object.values(model)) fn.mockReset();
  db.$transaction.mockImplementation(async (arg: unknown) => typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(db) : Promise.all(arg as unknown[]));
  db.productCategory.findMany.mockResolvedValue([{ name: 'Filtros' }]);
  db.productCategory.upsert.mockImplementation(async ({ create }: { create: { name: string } }) => create);
  db.ellonConnection.update.mockResolvedValue({});
  db.ellonEntityLink.count.mockResolvedValue(0);
  db.ellonEntityLink.findMany.mockResolvedValue([]);
  db.ellonEntityLink.updateMany.mockResolvedValue({ count: 0 });
});

describe('normalização de produto', () => {
  it('converte decimais brasileiros e preserva atributos do ERP', () => {
    const product = normalizedProduct({ id: '10', sequencia: '2', descricao: 'Filtro', preco_venda: '1.234,56', quantidade: '3,9', grupo: '  FILTROS   DE ÓLEO ', reduzida: 'ABC' });
    expect(product.data.salePrice.toNumber()).toBe(1234.56);
    expect(product.data.stock).toBe(3);
    expect(product.category).toBe('FILTROS DE ÓLEO');
    expect(product.externalSku).toBe('ABC');
    expect(product.specifications).toMatchObject({ ellonId: '10', ellonSequence: 2 });
  });

  it('rejeita produto sem ID numérico', () => {
    expect(() => normalizedProduct({ id: 'x' })).toThrow();
  });
});

describe('cliente HTTP', () => {
  const fetchMock = jest.fn();
  beforeAll(() => { global.fetch = fetchMock as unknown as typeof fetch; });
  beforeEach(() => fetchMock.mockReset());

  it('repete leituras após falha de rede em vez de travar como ambíguo', async () => {
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0; }) as unknown as typeof setTimeout);
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(json([{ id: 1 }]));
    await expect(new EllonClient().request('GET', '/publico/integracoes/clientes')).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });

  it('trata falha de rede numa escrita como resultado ambíguo, sem repetir', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(new EllonClient().request('POST', '/publico/integracoes/gerarprepedido', { body: {} })).rejects.toBeInstanceOf(AmbiguousEllonError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('sincronização de produtos', () => {
  const service = new EllonProductSyncService();
  let pages: unknown[][];
  beforeEach(() => {
    pages = [];
    jest.spyOn(ellonClient, 'request').mockImplementation(async (_m, _p, options) => pages[Number(options?.query?.pagina) - 1] ?? []);
  });
  afterEach(() => jest.restoreAllMocks());

  it('cria a categoria gerenciada e o produto com vínculo, em transação', async () => {
    pages = [[{ id: '1', sequencia: 0, descricao: 'Pastilha', grupo: 'FREIOS', reduzida: 'P1', quantidade: '5' }]];
    db.ellonConnection.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.findUnique.mockResolvedValue(null);
    db.product.findUnique.mockResolvedValue(null);
    db.product.create.mockResolvedValue({ id: 'local-1' });
    const result = await service.syncAll();
    expect(result).toMatchObject({ mode: 'full', created: 1, categoriesCreated: 1, received: 1 });
    expect(db.product.create.mock.calls[0][0].data).toMatchObject({ category: 'FREIOS', sku: 'P1', status: 'ACTIVE' });
    expect(db.ellonEntityLink.create).toHaveBeenCalled();
    expect(db.ellonConnection.update.mock.calls[0][0].data.lastFullProductSyncAt).toBeInstanceOf(Date);
  });

  it('não apaga fotos nem descrição editorial quando a Ellon não envia', async () => {
    pages = [[{ id: '1', sequencia: 0, descricao: 'Pastilha', grupo: 'filtros', aplicacao: 'Gol 1.0', quantidade: '0' }]];
    db.ellonConnection.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'link', localId: 'p1', metadata: {} });
    db.product.findUnique.mockResolvedValue({ id: 'p1', name: 'Pastilha', description: 'Texto de venda do M2', images: ['https://x/foto.jpg'], specifications: { seo: 'x' }, status: 'ACTIVE', offerType: null });
    await service.syncAll();
    const data = db.product.update.mock.calls[0][0].data;
    expect(data.images).toBeUndefined();
    expect(data.description).toBeUndefined();
    expect(data.category).toBe('Filtros');
    expect(data.status).toBe('OUT_OF_STOCK');
    expect(data.specifications).toMatchObject({ seo: 'x', application: 'Gol 1.0' });
  });

  it('usa SKU próprio quando a referência já pertence a outra variação vinculada', async () => {
    pages = [[{ id: '7', sequencia: 2, descricao: 'Óleo', reduzida: 'OLEO', quantidade: '1' }]];
    db.ellonConnection.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      where.entityType_localId ? { id: 'other-link' } : null);
    db.product.findUnique.mockImplementation(async ({ where }: { where: Record<string, unknown> }) =>
      where.sku === 'OLEO' ? { id: 'p-seq-1' } : null);
    db.product.create.mockResolvedValue({ id: 'new' });
    await service.syncAll();
    expect(db.product.create.mock.calls[0][0].data.sku).toBe('ELLON-7-2');
  });

  it('incremental usa um dia de margem e grava o início da execução como checkpoint', async () => {
    const last = new Date('2026-10-10T02:00:00Z');
    db.ellonConnection.findUnique.mockResolvedValue({ lastProductSyncAt: last, lastFullProductSyncAt: new Date() });
    const before = Date.now();
    await service.syncAll();
    expect((ellonClient.request as jest.Mock).mock.calls[0][2].body).toEqual({ data_alteracao: localDate(new Date(last.getTime() - 86_400_000)) });
    expect(db.ellonConnection.update.mock.calls[0][0].data.lastProductSyncAt.getTime()).toBeLessThanOrEqual(Date.now());
    expect(db.ellonConnection.update.mock.calls[0][0].data.lastProductSyncAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('não inativa produtos quando a carga completa volta muito menor que o esperado', async () => {
    pages = [[{ id: '1', sequencia: 0, descricao: 'A', quantidade: '1' }]];
    db.ellonConnection.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'link', localId: 'p1', metadata: {} });
    db.product.findUnique.mockResolvedValue({ id: 'p1', name: 'A', description: '', images: [], specifications: {}, status: 'ACTIVE' });
    db.ellonEntityLink.count.mockResolvedValue(10);
    db.ellonEntityLink.findMany.mockResolvedValue(Array.from({ length: 9 }, (_, i) => ({ id: `l${i}`, localId: `x${i}` })));
    const result = await service.syncAll();
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(result.errors[0].message).toMatch(/inativação suspensa/);
  });

  it('retoma da página salva após falha', async () => {
    pages = [[{ id: '1' }], [{ id: '2' }], []];
    db.ellonConnection.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'link', localId: 'p', metadata: {} });
    db.product.findUnique.mockResolvedValue({ id: 'p', name: 'x', description: '', images: [], specifications: {}, status: 'ACTIVE' });
    const progress = { mode: 'full' as const, since: null, runStartedAt: new Date().toISOString(), nextPage: 2, fingerprints: [], result: { mode: 'full' as const, pages: 1, received: 1, created: 0, updated: 1, linkedBySku: 0, deactivated: 0, categoriesCreated: 0, skipped: 0, errors: [] } };
    const result = await service.syncAll({ progress });
    expect((ellonClient.request as jest.Mock).mock.calls[0][2].query.pagina).toBe(2);
    expect(result.updated).toBe(2);
  });
});

describe('clientes nos dois sentidos', () => {
  afterEach(() => jest.restoreAllMocks());

  it('atualização enviada à Ellon não apaga campos que o M2 não possui', async () => {
    const customer = { id: 'c1', name: 'Ana', cpf: '12345678901', birthDate: null, email: 'ana@x.com', phone: '11999999999', status: 'ACTIVE', addresses: [] };
    db.customer.findUnique.mockResolvedValue(customer);
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'l', externalId: '55', metadata: { exportHash: 'antigo' } });
    db.ellonSnapshot.findUnique.mockResolvedValue({ payload: { id: 55, rg_ie: '123', telefone: '1133334444', endereco: 'Rua A', cep: '01001000' } });
    const request = jest.spyOn(ellonClient, 'request').mockResolvedValue({ id: 55 });
    await new EllonExportService().exportCustomer('c1');
    const body = request.mock.calls[0][2]?.body as Record<string, unknown>;
    expect(body).toMatchObject({ id: 55, rg_ie: '123', telefone: '1133334444', endereco: 'Rua A', cep: '01001000', celular: '11999999999', email: 'ana@x.com' });
  });

  it('não reenvia à Ellon quando nada mudou desde a última sincronização', async () => {
    const customer = { id: 'c1', name: 'Ana', cpf: null, birthDate: null, email: 'ana@x.com', phone: '1', status: 'ACTIVE', addresses: [] };
    const { payloadHash } = await import('../src/modules/ellon/ellon-sync.util.js');
    db.customer.findUnique.mockResolvedValue(customer);
    db.ellonEntityLink.findUnique.mockResolvedValue({ id: 'l', externalId: '55', metadata: { exportHash: payloadHash(customerPayload(customer as never, undefined)) } });
    const request = jest.spyOn(ellonClient, 'request');
    await expect(new EllonExportService().exportCustomer('c1')).resolves.toEqual({ externalId: '55', skipped: true });
    expect(request).not.toHaveBeenCalled();
  });

  it('importa endereço e atualiza cliente já vinculado', async () => {
    jest.spyOn(ellonClient, 'request').mockImplementation(async (_m, _p, options) => Number(options?.query?.pagina) === 1
      ? [{ id: 9, nome: 'Bruno Novo', celular: '(11) 98888-7777', endereco: 'Av. B', numero: '10', bairro: 'Centro', cidade: 'São Paulo', uf: 'sp', cep: '01310-100' }]
      : []);
    const customer = { id: 'c9', name: 'Bruno', phone: '1', email: 'b@x.com', cpf: null, birthDate: null, status: 'ACTIVE' };
    db.ellonSnapshot.upsert.mockResolvedValue({});
    db.ellonEntityLink.findFirst.mockResolvedValue({ id: 'l9', localId: 'c9', metadata: {} });
    db.customer.findUnique.mockResolvedValue(customer);
    db.customer.findUniqueOrThrow.mockResolvedValue(customer);
    db.ellonJob.findFirst.mockResolvedValue(null);
    db.address.findFirst.mockResolvedValue(null);
    db.address.count.mockResolvedValue(0);
    db.address.create.mockResolvedValue({ id: 'a1' });
    const result = await new EllonMasterSyncService().syncCustomers();
    expect(db.customer.update.mock.calls[0][0].data).toEqual({ name: 'Bruno Novo', phone: '11988887777' });
    expect(db.address.create.mock.calls[0][0].data).toMatchObject({ state: 'SP', zipCode: '01310100', isDefault: true });
    expect(result).toMatchObject({ updated: 1, addresses: 1 });
    expect(db.ellonEntityLink.update.mock.calls.at(-1)[0].data.metadata).toMatchObject({ addressId: 'a1', exportHash: expect.any(String) });
  });

  it('não sobrescreve cliente com alteração local ainda não enviada', async () => {
    jest.spyOn(ellonClient, 'request').mockImplementation(async (_m, _p, options) => Number(options?.query?.pagina) === 1 ? [{ id: 9, nome: 'Outro nome' }] : []);
    db.ellonSnapshot.upsert.mockResolvedValue({});
    db.ellonEntityLink.findFirst.mockResolvedValue({ id: 'l9', localId: 'c9', metadata: {} });
    db.customer.findUnique.mockResolvedValue({ id: 'c9', name: 'Editado no site' });
    db.customer.findUniqueOrThrow.mockResolvedValue({ id: 'c9', name: 'Editado no site' });
    db.ellonJob.findFirst.mockResolvedValue({ id: 'export-pendente' });
    await new EllonMasterSyncService().syncCustomers();
    expect(db.customer.update).not.toHaveBeenCalled();
  });
});

describe('pedidos', () => {
  afterEach(() => jest.restoreAllMocks());

  it('concilia pré-pedido criado após timeout e aplica cancelamento da Ellon', async () => {
    const orderId = '3f0f8c4e-2b7a-4c3e-9a51-1f2d3c4b5a69';
    jest.spyOn(ellonClient, 'request').mockImplementation(async (_m, path, options) =>
      path.includes('prepedidosdetalhados') && Number(options?.query?.pagina) === 1
        ? { pedidos: [{ numero: 777, id_pedido_site: `PED-${orderId}`, status: 'CANCELADO' }] }
        : []);
    db.ellonConnection.findUnique.mockResolvedValue({ lastOrderSyncAt: new Date() });
    db.ellonSnapshot.upsert.mockResolvedValue({});
    db.ellonEntityLink.findMany.mockResolvedValue([]);
    db.order.findUnique.mockResolvedValue({ id: orderId });
    db.ellonEntityLink.findUnique.mockResolvedValue(null);
    db.ellonEntityLink.create.mockResolvedValue({ id: 'new-link', entityType: 'ORDER', localId: orderId, metadata: {} });
    db.ellonJob.updateMany.mockResolvedValue({ count: 1 });
    db.order.updateMany.mockResolvedValue({ count: 1 });
    const result = await new EllonMasterSyncService().syncOrders();
    expect(db.ellonEntityLink.create.mock.calls[0][0].data).toMatchObject({ entityType: 'ORDER', localId: orderId, externalId: '777' });
    expect(db.ellonJob.updateMany.mock.calls[0][0].data.status).toBe('SUCCEEDED');
    expect(db.order.updateMany.mock.calls[0][0].data.status).toBe('CANCELLED');
    expect(result).toMatchObject({ reconciled: 1, cancelled: 1 });
  });
});
