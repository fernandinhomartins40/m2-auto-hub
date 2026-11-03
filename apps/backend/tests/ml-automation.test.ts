import { ListingSyncStatus, MarketplaceProvider } from '@prisma/client';

jest.mock('../src/config/database.js', () => {
  const model = () => ({
    findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(),
    upsert: jest.fn(), count: jest.fn(), groupBy: jest.fn(),
  });
  return { prisma: { marketplaceListing: model(), marketplaceConnection: model(), marketplaceEvent: model(), admin: model() } };
});
jest.mock('../src/config/environment.js', () => ({ environment: { app: { baseUrl: 'https://loja.test' } } }));
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../src/modules/marketplace/services/marketplace-notifier.js', () => ({ notifyStore: jest.fn() }));
jest.mock('../src/modules/marketplace/services/token-refresh.service.js', () => ({
  tokenRefreshService: { ensureFreshToken: jest.fn().mockResolvedValue({ accessToken: 't', sellerId: '1' }) },
}));
const adapter = {
  pauseListing: jest.fn(), activateListing: jest.fn(), updateListing: jest.fn(), fetchListingStatus: jest.fn(),
  verifyWebhook: jest.fn().mockReturnValue(true), parseWebhook: jest.fn(),
};
jest.mock('../src/modules/marketplace/adapters/index.js', () => ({ getAdapter: () => adapter }));
jest.mock('../src/modules/marketplace/mappers/product-normalizer.js', () => ({ loadAndNormalizeProduct: jest.fn() }));
jest.mock('../src/modules/marketplace/services/connection.service.js', () => ({
  connectionService: { getRaw: jest.fn(), toAccount: jest.fn() },
}));
jest.mock('../src/modules/marketplace/services/ml-order.service.js', () => ({
  mlOrderService: { sync: jest.fn(), syncShipment: jest.fn() },
}));
jest.mock('../src/modules/marketplace/services/order-import.service.js', () => ({
  orderImportService: { importOrder: jest.fn() },
}));

import { prisma } from '../src/config/database.js';
import { notifyStore } from '../src/modules/marketplace/services/marketplace-notifier.js';
import { loadAndNormalizeProduct } from '../src/modules/marketplace/mappers/product-normalizer.js';
import { connectionService } from '../src/modules/marketplace/services/connection.service.js';
import { mlOrderService } from '../src/modules/marketplace/services/ml-order.service.js';
import { needsPush, syncService } from '../src/modules/marketplace/services/sync.service.js';
import { eventProcessorService } from '../src/modules/marketplace/services/event-processor.service.js';
import { webhookController } from '../src/modules/marketplace/webhook.controller.js';

type Model = Record<string, jest.Mock>;
const db = prisma as unknown as Record<string, Model>;

const listing = (overrides: Record<string, unknown> = {}) => ({
  id: 'l1', productId: 'p1', provider: MarketplaceProvider.MERCADO_LIVRE, externalId: 'MLB1', externalUrl: null,
  status: ListingSyncStatus.PUBLISHED, pausedBySystem: false, lastSyncedPrice: 100, lastSyncedStock: 2, lastError: null,
  ...overrides,
}) as never;
const product = (stock: number, price = 100) => ({ id: 'p1', name: 'Filtro', price, stock, images: [], publication: { title: 'Filtro X', saleTerms: [] } }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  db.marketplaceListing.update.mockImplementation(({ data }: { data: object }) => Promise.resolve({ ...(listing() as object), ...data }));
});

describe('estoque da loja → Mercado Livre', () => {
  it('estoque zerado pausa antes de qualquer outra chamada e avisa a loja', async () => {
    const result = await syncService.pushListing(listing(), product(0));
    expect(adapter.pauseListing).toHaveBeenCalledWith(expect.anything(), 'MLB1');
    expect(adapter.pauseListing.mock.invocationCallOrder[0]).toBeLessThan(adapter.updateListing.mock.invocationCallOrder[0]);
    expect(adapter.updateListing.mock.calls[0][2].stock).toBeUndefined();
    expect(result).toMatchObject({ status: ListingSyncStatus.PAUSED, pausedBySystem: true, lastSyncedStock: 0 });
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_LISTING_PAUSED', expect.any(String), expect.stringContaining('Filtro X'), expect.anything());
  });

  it('estoque de volta reativa o que o sistema pausou', async () => {
    const result = await syncService.pushListing(listing({ status: ListingSyncStatus.PAUSED, pausedBySystem: true, lastSyncedStock: 0 }), product(3));
    expect(adapter.updateListing.mock.calls[0][2].stock).toBe(3);
    expect(adapter.activateListing).toHaveBeenCalled();
    expect(result).toMatchObject({ status: ListingSyncStatus.PUBLISHED, pausedBySystem: false });
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_LISTING_REACTIVATED', expect.any(String), expect.any(String), expect.anything());
  });

  it('pausa feita pela loja continua pausada mesmo com estoque', async () => {
    const result = await syncService.pushListing(listing({ status: ListingSyncStatus.PAUSED, pausedBySystem: false, lastSyncedStock: 0 }), product(3));
    expect(adapter.activateListing).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: ListingSyncStatus.PAUSED });
  });

  it('nada mudou: não chama o Mercado Livre', async () => {
    await syncService.pushListing(listing(), product(2));
    expect(adapter.updateListing).not.toHaveBeenCalled();
    expect(adapter.pauseListing).not.toHaveBeenCalled();
  });

  it('falha ao atualizar marca para nova tentativa e avisa só na primeira vez', async () => {
    db.marketplaceListing.findMany.mockResolvedValue([listing()]);
    (connectionService.getRaw as jest.Mock).mockResolvedValue({ status: 'CONNECTED' });
    (loadAndNormalizeProduct as jest.Mock).mockResolvedValue(product(0));
    adapter.pauseListing.mockRejectedValueOnce(new Error('ML fora do ar'));

    await syncService.syncProduct('p1');
    expect(db.marketplaceListing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ListingSyncStatus.OUT_OF_SYNC }) }));
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_LISTING_ERROR', expect.any(String), expect.any(String), expect.anything());

    (notifyStore as jest.Mock).mockClear();
    db.marketplaceListing.findMany.mockResolvedValue([listing({ status: ListingSyncStatus.OUT_OF_SYNC })]);
    adapter.pauseListing.mockRejectedValueOnce(new Error('ML fora do ar'));
    await syncService.syncProduct('p1');
    expect(notifyStore).not.toHaveBeenCalled();
  });

  it('a conferência periódica detecta o que precisa ir ao Mercado Livre', () => {
    expect(needsPush(listing(), 100, 0)).toBe(true);
    expect(needsPush(listing(), 100, 2)).toBe(false);
    expect(needsPush(listing(), 110, 2)).toBe(true);
    expect(needsPush(listing({ status: ListingSyncStatus.PAUSED, pausedBySystem: true, lastSyncedStock: 0 }), 100, 1)).toBe(true);
    expect(needsPush(listing({ status: ListingSyncStatus.PAUSED, pausedBySystem: false, lastSyncedStock: 0 }), 100, 0)).toBe(false);
    expect(needsPush(listing({ status: ListingSyncStatus.OUT_OF_SYNC }), 100, 2)).toBe(true);
  });
});

describe('avisos do Mercado Livre → sistema', () => {
  const event = (topic: string, externalId: string) => ({ id: 'e1', provider: MarketplaceProvider.MERCADO_LIVRE, topic, externalId, attempts: 0 });

  it('venda e envio vão para o acompanhamento de vendas', async () => {
    db.marketplaceEvent.findMany.mockResolvedValue([event('orders_v2', '2000001'), event('shipments', '4000001')]);
    await eventProcessorService.processPending();
    expect(mlOrderService.sync).toHaveBeenCalledWith('2000001');
    expect(mlOrderService.syncShipment).toHaveBeenCalledWith('4000001');
    expect(db.marketplaceEvent.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ processed: true }) }));
  });

  it('anúncio encerrado direto no Mercado Livre aparece no painel e avisa a loja', async () => {
    db.marketplaceEvent.findMany.mockResolvedValue([event('items', 'MLB1')]);
    db.marketplaceListing.findFirst.mockResolvedValue(listing());
    adapter.fetchListingStatus.mockResolvedValue({ status: 'closed', subStatus: [] });
    await eventProcessorService.processPending();
    expect(db.marketplaceListing.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ListingSyncStatus.ERROR }) }));
    expect(notifyStore).toHaveBeenCalledWith('MARKETPLACE_LISTING_ERROR', expect.any(String), expect.any(String), expect.anything());
  });

  it('pausa do próprio Mercado Livre por falta de estoque fica como pausa do sistema', async () => {
    db.marketplaceEvent.findMany.mockResolvedValue([event('items', 'MLB1')]);
    db.marketplaceListing.findFirst.mockResolvedValue(listing());
    adapter.fetchListingStatus.mockResolvedValue({ status: 'paused', subStatus: ['out_of_stock'] });
    await eventProcessorService.processPending();
    expect(db.marketplaceListing.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: ListingSyncStatus.PAUSED, pausedBySystem: true } }));
  });

  it('aviso repetido do mesmo pedido volta para a fila (cancelamento depois do pagamento)', async () => {
    adapter.parseWebhook.mockReturnValue({ provider: MarketplaceProvider.MERCADO_LIVRE, topic: 'orders_v2', externalId: '2000001', raw: {} });
    (connectionService.getRaw as jest.Mock).mockResolvedValue(null);
    db.marketplaceEvent.upsert.mockResolvedValue({});
    db.marketplaceEvent.findMany.mockResolvedValue([]);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
    await webhookController.mercadoLivre({ body: {} } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.marketplaceEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ processed: false, attempts: 0 }) }));
  });
});
