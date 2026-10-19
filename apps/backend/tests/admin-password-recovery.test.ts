import { createHash } from 'node:crypto';
import { prisma } from '../src/config/database.js';
import { AdminPasswordRecoveryService } from '../src/modules/auth/admin-password-recovery.service.js';
import { TransactionalEmailService } from '../src/shared/services/transactional-email.service.js';

jest.mock('../src/config/database.js', () => ({ prisma: {
  admin: { findFirst: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
  adminPasswordResetToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../src/shared/services/transactional-email.service.js', () => ({ TransactionalEmailService: { send: jest.fn() } }));
jest.mock('../src/shared/utils/hash.util.js', () => ({ HashUtil: { hashPassword: jest.fn().mockResolvedValue('new-hash') } }));

const db = prisma as unknown as {
  admin: { findFirst: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock };
  adminPasswordResetToken: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
  $transaction: jest.Mock;
};
const service = new AdminPasswordRecoveryService();
const admin = { id: 'admin-1', email: 'equipe@example.com', status: 'ACTIVE', password: 'old-hash' };
const record = { id: 'token-1', adminId: admin.id, email: admin.email,
  passwordDigest: createHash('sha256').update(admin.password).digest('hex'), usedAt: null, expiresAt: new Date(Date.now() + 60000) };

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.admin.findFirst.mockResolvedValue(admin);
  db.admin.findUnique.mockResolvedValue(admin);
  db.admin.updateMany.mockResolvedValue({ count: 1 });
  db.adminPasswordResetToken.create.mockResolvedValue({ id: record.id });
  db.adminPasswordResetToken.findUnique.mockResolvedValue(record);
  db.adminPasswordResetToken.updateMany.mockResolvedValue({ count: 1 });
  (TransactionalEmailService.send as jest.Mock).mockResolvedValue(undefined);
});

it('only sends recovery for active staff accounts', async () => {
  db.admin.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...admin, status: 'SUSPENDED' });
  await service.request(admin.email);
  await service.request(admin.email);
  expect(TransactionalEmailService.send).not.toHaveBeenCalled();
});

it('sends a dedicated admin reset URL without storing its raw token', async () => {
  await service.request(admin.email);
  const text = (TransactionalEmailService.send as jest.Mock).mock.calls[0][2] as string;
  const token = text.match(/redefinir-senha-admin#token=([a-f0-9]{64})/)![1];
  expect(db.adminPasswordResetToken.create.mock.calls[0][0].data.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
});

it.each([null, { ...record, expiresAt: new Date(0) }, { ...record, usedAt: new Date() }])('rejects missing, expired or used tokens', async (value) => {
  db.adminPasswordResetToken.findUnique.mockResolvedValue(value);
  await expect(service.consume('a'.repeat(64), 'password')).rejects.toThrow();
  expect(db.admin.updateMany).not.toHaveBeenCalled();
});

it.each([{ ...admin, email: 'new@example.com' }, { ...admin, password: 'changed-hash' }, { ...admin, status: 'SUSPENDED' }])('rejects recovery after the account changes', async (value) => {
  db.admin.findUnique.mockResolvedValue(value);
  await expect(service.consume('a'.repeat(64), 'password')).rejects.toThrow();
  expect(db.admin.updateMany).not.toHaveBeenCalled();
});

it('rejects a concurrent token claim', async () => {
  db.adminPasswordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });
  await expect(service.consume('a'.repeat(64), 'password')).rejects.toThrow();
  expect(db.admin.updateMany).not.toHaveBeenCalled();
});

it('updates the password and revokes remaining reset links atomically', async () => {
  await service.consume('a'.repeat(64), 'password');
  expect(db.admin.updateMany).toHaveBeenCalledWith({ where: { id: admin.id, email: admin.email, password: admin.password, status: 'ACTIVE' }, data: { password: 'new-hash', passwordChangedAt: expect.any(Date) } });
  expect(db.adminPasswordResetToken.updateMany).toHaveBeenLastCalledWith({ where: { adminId: admin.id, usedAt: null }, data: { usedAt: expect.any(Date) } });
});

it('removes undeliverable tokens', async () => {
  (TransactionalEmailService.send as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
  await expect(service.request(admin.email)).rejects.toThrow();
  expect(db.adminPasswordResetToken.deleteMany).toHaveBeenCalledWith({ where: { id: record.id } });
});
