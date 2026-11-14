import type { Request, Response } from 'express';
import { prisma } from '../src/config/database.js';
import pdfGeneratorService from '../src/shared/services/pdf-generator.service.js';
import { HashUtil } from '../src/shared/utils/hash.util.js';
import { JwtUtil } from '../src/shared/utils/jwt.util.js';
import { PrivacyController } from '../src/modules/privacy/privacy.controller.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { AuthMiddleware } from '../src/middlewares/auth.middleware.js';
import { CustomerController } from '../src/modules/customer/customer.controller.js';
import { CustomerRevisionsController } from '../src/modules/customer-revisions/customer-revisions.controller.js';
import { RevisionsController } from '../src/modules/revisions/revisions.controller.js';
import { settingsController } from '../src/modules/settings/settings.controller.js';

jest.mock('../src/config/database.js', () => ({ prisma: {
  customer: { updateMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  address: { updateMany: jest.fn(), deleteMany: jest.fn() },
  customerVehicle: { findMany: jest.fn(), update: jest.fn() },
  serviceOrder: { updateMany: jest.fn() },
  favorite: { deleteMany: jest.fn() },
  emailActionToken: { deleteMany: jest.fn() },
  relationshipMessage: { deleteMany: jest.fn() },
  notification: { deleteMany: jest.fn() },
  privacyRequest: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  order: { findFirst: jest.fn(), findMany: jest.fn() },
  revision: { findFirst: jest.fn(), findUnique: jest.fn() },
  settings: { findFirst: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../src/shared/services/pdf-generator.service.js', () => ({
  __esModule: true,
  default: { generatePdfBuffer: jest.fn(), sanitizeFilename: (name: string) => `${name}.pdf` },
}));
jest.mock('../src/shared/utils/hash.util.js', () => ({ HashUtil: { comparePassword: jest.fn(), hashPassword: jest.fn() } }));
jest.mock('../src/shared/utils/logger.util.js', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

type Mocked = Record<string, Record<string, jest.Mock>> & { $transaction: jest.Mock };
const db = prisma as unknown as Mocked;
const pdf = pdfGeneratorService as unknown as { generatePdfBuffer: jest.Mock };

function call(handler: (req: Request, res: Response, next: (e?: unknown) => void) => unknown, req: Partial<Request>) {
  const res = { statusCode: 200, body: undefined as unknown, headers: {} as Record<string, string> } as Record<string, unknown>;
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  res.send = jest.fn((body: unknown) => { res.body = body; return res; });
  res.setHeader = jest.fn();
  res.clearCookie = jest.fn();
  const next = jest.fn();
  return Promise.resolve(handler({ params: {}, query: {}, body: {}, ...req } as Request, res as unknown as Response, next))
    .then(() => ({ res, next, error: next.mock.calls[0]?.[0] as { statusCode?: number } | undefined }));
}

const customerId = 'customer-1';
const asCustomer = { user: { customerId, email: 'a@b.co', level: 'BRONZE', status: 'ACTIVE' } } as unknown as Partial<Request>;

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: Mocked) => unknown) => fn(db));
  db.customer.updateMany.mockResolvedValue({ count: 1 });
  db.customerVehicle.findMany.mockResolvedValue([{ id: 'vehicle-1' }]);
  db.privacyRequest.findFirst.mockResolvedValue(null);
  db.privacyRequest.create.mockImplementation(({ data }) => ({ id: 'request-1', ...data }));
  db.settings.findFirst.mockResolvedValue({ id: 'settings-1', appVersionPolicy: null });
  pdf.generatePdfBuffer.mockResolvedValue(Buffer.from('%PDF'));
});

describe('exclusão de conta', () => {
  const privacy = new PrivacyController();

  it('anonimiza na hora, mantém pedidos e responde o que foi apagado e o que fica', async () => {
    const { res, error } = await call(privacy.createRequest, { ...asCustomer, body: { type: 'DELETION', confirm: true } });
    expect(error).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ accountDeleted: true, status: 'COMPLETED', message: expect.stringContaining('Ficam') });
    expect(res.clearCookie).toHaveBeenCalledWith('authToken', expect.anything());

    const { where, data } = db.customer.updateMany.mock.calls[0][0];
    expect(where).toEqual({ id: customerId, deletedAt: null });
    expect(data).toMatchObject({ name: 'Cliente excluído', email: `excluido-${customerId}@deleted.invalid`, phone: '', cpf: null, password: '', status: 'INACTIVE' });
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.passwordChangedAt).toBeInstanceOf(Date);

    // Pedidos e o próprio cadastro (agora anônimo) continuam no banco para a loja.
    expect(db.customer.delete).not.toHaveBeenCalled();
    expect(db.order.findMany).not.toHaveBeenCalled();
    expect(db.address.deleteMany).toHaveBeenCalledWith({ where: { customerId, orders: { none: {} } } });
    expect(db.customerVehicle.update).toHaveBeenCalledWith({ where: { id: 'vehicle-1' }, data: expect.objectContaining({ plate: 'EXCLUIDO-vehicle-1', chassisNumber: null }) });
    expect(db.favorite.deleteMany).toHaveBeenCalledWith({ where: { customerId } });
  });

  it('pedido repetido não quebra nem cria outro registro', async () => {
    db.customer.updateMany.mockResolvedValue({ count: 0 });
    db.privacyRequest.findFirst.mockResolvedValue({ id: 'request-1', type: 'DELETION', status: 'COMPLETED' });
    const { res, error } = await call(privacy.createRequest, { ...asCustomer, body: { type: 'DELETION', confirm: true } });
    expect(error).toBeUndefined();
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ id: 'request-1', accountDeleted: true });
    expect(db.privacyRequest.create).not.toHaveBeenCalled();
    expect(db.favorite.deleteMany).not.toHaveBeenCalled();
  });

  it('sem confirm continua sendo só um pedido para a equipe', async () => {
    const { res } = await call(privacy.createRequest, { ...asCustomer, body: { type: 'DELETION' } });
    expect(res.statusCode).toBe(201);
    expect(db.customer.updateMany).not.toHaveBeenCalled();
  });

  it('equipe concluir um pedido de exclusão executa a anonimização', async () => {
    db.privacyRequest.findUnique.mockResolvedValue({ type: 'DELETION', customerId });
    db.privacyRequest.update.mockResolvedValue({ id: 'request-1', status: 'COMPLETED' });
    const { error } = await call(privacy.updateRequest, { params: { id: 'request-1' }, admin: { adminId: 'admin-1' }, body: { status: 'COMPLETED' } } as unknown as Partial<Request>);
    expect(error).toBeUndefined();
    expect(db.customer.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: customerId, deletedAt: null } }));
  });

  it('conta excluída não loga, mesmo que a senha conferisse', async () => {
    db.customer.findFirst.mockResolvedValue({ id: customerId, email: 'a@b.co', password: 'hash', status: 'INACTIVE', deletedAt: new Date() });
    (HashUtil.comparePassword as jest.Mock).mockResolvedValue(true);
    await expect(new AuthService().login({ identifier: 'a@b.co', password: 'x' })).rejects.toMatchObject({ statusCode: 401 });
  });

  it('token emitido antes da exclusão deixa de valer', async () => {
    const token = JwtUtil.generateToken({ customerId, email: 'a@b.co', level: 'BRONZE', status: 'ACTIVE' });
    db.customer.findUnique.mockResolvedValue({ email: 'x', level: 'BRONZE', status: 'INACTIVE', passwordChangedAt: new Date() });
    const { error } = await call(AuthMiddleware.authenticate, { headers: { authorization: `Bearer ${token}` }, cookies: {} } as Partial<Request>);
    expect(error).toMatchObject({ statusCode: 401 });
  });
});

describe('PDF pelos apps', () => {
  it('cliente não baixa orçamento de outro cliente', async () => {
    db.order.findFirst.mockResolvedValue(null);
    const { res } = await call(new CustomerController().exportMyQuotePdf, { ...asCustomer, params: { id: 'quote-de-outro' } });
    expect(db.order.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'quote-de-outro', customerId }) }));
    expect(res.statusCode).toBe(404);
    expect(pdf.generatePdfBuffer).not.toHaveBeenCalled();
  });

  it('sem html no corpo o servidor monta o orçamento', async () => {
    const now = new Date();
    db.order.findFirst.mockResolvedValue({
      id: 'quote-1234567', customerId, total: 100, quoteStatus: 'QUOTED', quoteNotes: null, createdAt: now, updatedAt: now,
      items: [{ id: 'i', type: 'SERVICE', serviceId: 's', name: 'Troca de óleo', quantity: 1, price: 100, quotedPrice: 100 }],
      address: null, customer: { name: 'Fulano', phone: '43999999999', email: 'a@b.co' },
    });
    const { res } = await call(new CustomerController().exportMyQuotePdf, { ...asCustomer, params: { id: 'quote-1234567' }, body: undefined });
    expect(res.statusCode).toBe(200);
    expect(pdf.generatePdfBuffer.mock.calls[0][0].bodyHtml).toContain('Troca de óleo');
  });

  it('cliente não baixa revisão de outro cliente', async () => {
    db.revision.findFirst.mockResolvedValue(null);
    await expect(call(new CustomerRevisionsController().exportCustomerRevisionPdf, { ...asCustomer, params: { id: 'rev-de-outro' } })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.revision.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'rev-de-outro', customerId } }));
    expect(pdf.generatePdfBuffer).not.toHaveBeenCalled();
  });

  it('mecânico só baixa revisão atribuída a ele', async () => {
    const revision = { id: 'rev-1', assignedMechanicId: 'outro', checklistItems: [], vehicle: { brand: 'VW', model: 'Gol' }, customer: { name: 'Fulano' } };
    db.revision.findUnique.mockResolvedValue(revision);
    const controller = new RevisionsController();
    const denied = await call(controller.exportRevisionPdf, { params: { id: 'rev-1' }, admin: { adminId: 'mec-1', role: 'STAFF' } } as unknown as Partial<Request>);
    expect(denied.error).toMatchObject({ statusCode: 403 });

    db.revision.findUnique.mockResolvedValue({ ...revision, assignedMechanicId: 'mec-1' });
    const allowed = await call(controller.exportRevisionPdf, { params: { id: 'rev-1' }, admin: { adminId: 'mec-1', role: 'STAFF' } } as unknown as Partial<Request>);
    expect(allowed.res.statusCode).toBe(200);
    expect(pdf.generatePdfBuffer.mock.calls[0][0].bodyHtml).toContain('Revisão #rev-1');
  });
});

describe('versão mínima do app', () => {
  it('padrão é build 1 com link da Play', async () => {
    const { res } = await call(settingsController.getAppVersion.bind(settingsController), { query: { app: 'cliente', platform: 'android' } });
    expect(res.body).toEqual({ success: true, data: {
      app: 'cliente', platform: 'android', minBuild: 1,
      storeUrl: 'https://play.google.com/store/apps/details?id=br.com.m2centerauto.cliente',
    } });
  });

  it('usa o valor configurado no banco', async () => {
    db.settings.findFirst.mockResolvedValue({ appVersionPolicy: { mecanico: { ios: { minBuild: 42, storeUrl: 'https://apps.apple.com/app/id1' } } } });
    const { res } = await call(settingsController.getAppVersion.bind(settingsController), { query: { app: 'mecanico', platform: 'ios' } });
    expect(res.body).toMatchObject({ data: { minBuild: 42, storeUrl: 'https://apps.apple.com/app/id1' } });
  });

  it('recusa app ou plataforma desconhecidos', async () => {
    const { res } = await call(settingsController.getAppVersion.bind(settingsController), { query: { app: 'admin', platform: 'android' } });
    expect(res.statusCode).toBe(400);
  });
});
