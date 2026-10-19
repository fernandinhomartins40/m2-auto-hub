import { createHash } from 'node:crypto';
import { prisma } from '../src/config/database.js';
import { TransactionalEmailService } from '../src/shared/services/transactional-email.service.js';
import { EmailAuthService } from '../src/modules/auth/email-auth.service.js';

jest.mock('../src/config/database.js', () => ({ prisma: {
  customer: { findUnique: jest.fn(), updateMany: jest.fn() },
  emailActionToken: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('../src/shared/services/transactional-email.service.js', () => ({ TransactionalEmailService: { send: jest.fn() } }));
jest.mock('../src/shared/utils/hash.util.js', () => ({ HashUtil: { hashPassword: jest.fn().mockResolvedValue('hashed-password') } }));

const db = prisma as unknown as {
  customer: { findUnique: jest.Mock; updateMany: jest.Mock };
  emailActionToken: { create: jest.Mock; findUnique: jest.Mock; updateMany: jest.Mock; deleteMany: jest.Mock };
  $transaction: jest.Mock;
};
const service = new EmailAuthService();
const customer = { id: 'customer-1', email: 'cliente@example.com', status: 'ACTIVE', emailVerifiedAt: null };
const record = { id: 'token-1', customerId: customer.id, email: customer.email, purpose: 'RESET_PASSWORD', usedAt: null, expiresAt: new Date(Date.now() + 60000) };

beforeEach(() => {
  jest.clearAllMocks();
  db.$transaction.mockImplementation((fn: (tx: typeof db) => unknown) => fn(db));
  db.customer.findUnique.mockResolvedValue(customer);
  db.customer.updateMany.mockResolvedValue({ count: 1 });
  db.emailActionToken.create.mockResolvedValue({ id: 'token-1' });
  db.emailActionToken.findUnique.mockResolvedValue(record);
  db.emailActionToken.updateMany.mockResolvedValue({ count: 1 });
  (TransactionalEmailService.send as jest.Mock).mockResolvedValue(undefined);
});

it('does not send mail for missing or blocked accounts', async () => {
  db.customer.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...customer, status: 'BLOCKED' });
  await service.request(customer.email, 'RESET_PASSWORD');
  await service.request(customer.email, 'RESET_PASSWORD');
  expect(TransactionalEmailService.send).not.toHaveBeenCalled();
});

it('stores only a digest and sends an expiring fragment link', async () => {
  await service.request(customer.email, 'RESET_PASSWORD');
  const text = (TransactionalEmailService.send as jest.Mock).mock.calls[0][2] as string;
  const token = text.match(/#token=([a-f0-9]{64})/)![1];
  const data = db.emailActionToken.create.mock.calls[0][0].data;
  expect(data.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
  expect(data.tokenHash).not.toBe(token);
  expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  expect(data.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 30 * 60000);
});

it.each([
  { ...record, expiresAt: new Date(0) },
  { ...record, usedAt: new Date() },
  { ...record, purpose: 'VERIFY_EMAIL' },
  null,
])('rejects expired, consumed, wrong-purpose and unknown tokens', async (value) => {
  db.emailActionToken.findUnique.mockResolvedValue(value);
  await expect(service.consume('a'.repeat(64), 'RESET_PASSWORD', 'new-password')).rejects.toThrow();
  expect(db.customer.updateMany).not.toHaveBeenCalled();
});

it('rejects tokens after an email change', async () => {
  db.customer.findUnique.mockResolvedValue({ ...customer, email: 'changed@example.com' });
  await expect(service.consume('a'.repeat(64), 'RESET_PASSWORD', 'new-password')).rejects.toThrow();
  expect(db.customer.updateMany).not.toHaveBeenCalled();
});

it('rejects a concurrent claim without changing the password', async () => {
  db.emailActionToken.updateMany.mockResolvedValueOnce({ count: 0 });
  await expect(service.consume('a'.repeat(64), 'RESET_PASSWORD', 'new-password')).rejects.toThrow();
  expect(db.customer.updateMany).not.toHaveBeenCalled();
});

it('changes the password and invalidates outstanding reset links in one transaction', async () => {
  await service.consume('a'.repeat(64), 'RESET_PASSWORD', 'new-password');
  expect(db.customer.updateMany).toHaveBeenCalledWith({ where: { id: customer.id, email: customer.email, status: 'ACTIVE' }, data: { password: 'hashed-password', passwordChangedAt: expect.any(Date) } });
  expect(db.emailActionToken.updateMany).toHaveBeenLastCalledWith({ where: { customerId: customer.id, purpose: 'RESET_PASSWORD', usedAt: null }, data: { usedAt: expect.any(Date) } });
});

it('removes the token if sending fails', async () => {
  (TransactionalEmailService.send as jest.Mock).mockRejectedValueOnce(new Error('provider down'));
  await expect(service.request(customer.email, 'RESET_PASSWORD')).rejects.toThrow('provider down');
  expect(db.emailActionToken.deleteMany).toHaveBeenCalledWith({ where: { id: 'token-1' } });
});
