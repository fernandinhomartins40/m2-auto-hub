import { createHash, randomBytes } from 'node:crypto';
import { CustomerStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { TransactionalEmailService } from '@shared/services/transactional-email.service.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
type Purpose = 'RESET_PASSWORD' | 'VERIFY_EMAIL';

export class EmailAuthService {
  async request(email: string, purpose: Purpose): Promise<void> {
    const customer = await prisma.customer.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!customer || customer.status !== CustomerStatus.ACTIVE || (purpose === 'VERIFY_EMAIL' && customer.emailVerifiedAt)) return;
    const token = randomBytes(32).toString('hex');
    const record = await prisma.emailActionToken.create({ data: {
      customerId: customer.id, email: customer.email, purpose, tokenHash: digest(token),
      expiresAt: new Date(Date.now() + (purpose === 'RESET_PASSWORD' ? 30 * 60 : 24 * 60 * 60) * 1000),
    } });
    const url = new URL(purpose === 'RESET_PASSWORD' ? '/redefinir-senha' : '/confirmar-email', process.env.APP_BASE_URL || 'http://localhost:8080');
    url.hash = new URLSearchParams({ token }).toString();
    try {
      await TransactionalEmailService.send(customer.email,
        purpose === 'RESET_PASSWORD' ? 'M2 Auto Center — recuperação de senha' : 'M2 Auto Center — confirme seu e-mail',
        purpose === 'RESET_PASSWORD'
          ? `Para redefinir sua senha, acesse: ${url}\nEste link é válido por 30 minutos e só pode ser usado uma vez. Se não foi você, ignore esta mensagem.`
          : `Confirme seu endereço de e-mail: ${url}\nEste link é válido por 24 horas e só pode ser usado uma vez. Se não foi você, ignore esta mensagem.`);
    } catch (error) {
      await prisma.emailActionToken.deleteMany({ where: { id: record.id } });
      throw error;
    }
  }

  async consume(token: string, purpose: Purpose, password?: string): Promise<void> {
    const hashedPassword = password ? await HashUtil.hashPassword(password) : undefined;
    await prisma.$transaction(async (tx) => {
      const record = await tx.emailActionToken.findUnique({ where: { tokenHash: digest(token) } });
      if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt <= new Date()) {
        throw ApiError.badRequest('Link inválido ou expirado. Solicite um novo e-mail.');
      }
      const customer = await tx.customer.findUnique({ where: { id: record.customerId } });
      if (!customer || customer.email !== record.email || customer.status !== CustomerStatus.ACTIVE) {
        throw ApiError.badRequest('Link inválido ou expirado. Solicite um novo e-mail.');
      }
      const claimed = await tx.emailActionToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (claimed.count !== 1) throw ApiError.badRequest('Este link já foi utilizado.');
      const updated = await tx.customer.updateMany({ where: { id: customer.id, email: record.email, status: CustomerStatus.ACTIVE }, data: purpose === 'RESET_PASSWORD'
        ? { password: hashedPassword!, passwordChangedAt: new Date() }
        : { emailVerifiedAt: new Date() } });
      if (updated.count !== 1) throw ApiError.badRequest('A conta foi alterada. Solicite um novo e-mail.');
      await tx.emailActionToken.updateMany({ where: { customerId: customer.id, purpose, usedAt: null }, data: { usedAt: new Date() } });
    });
  }
}
