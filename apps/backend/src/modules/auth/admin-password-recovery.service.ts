import { createHash, randomBytes } from 'node:crypto';
import { AdminStatus } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { HashUtil } from '@shared/utils/hash.util.js';
import { TransactionalEmailService } from '@shared/services/transactional-email.service.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const invalidLink = () => ApiError.badRequest('Link inválido ou expirado. Solicite um novo e-mail.');

export class AdminPasswordRecoveryService {
  async request(email: string): Promise<void> {
    const admin = await prisma.admin.findFirst({
      where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin || admin.status !== AdminStatus.ACTIVE) return;
    const token = randomBytes(32).toString('hex');
    const record = await prisma.adminPasswordResetToken.create({ data: {
      adminId: admin.id, email: admin.email, tokenHash: digest(token), passwordDigest: digest(admin.password),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    } });
    const url = new URL('/redefinir-senha-admin', process.env.APP_BASE_URL || 'http://localhost:8080');
    url.hash = new URLSearchParams({ token }).toString();
    try {
      await TransactionalEmailService.send(admin.email, 'M2 Auto Center — recuperação de acesso da equipe',
        `Para redefinir sua senha de acesso ao painel da loja ou oficina, acesse: ${url}\nEste link é válido por 30 minutos e só pode ser usado uma vez. Se não foi você, ignore esta mensagem.`);
    } catch (error) {
      await prisma.adminPasswordResetToken.deleteMany({ where: { id: record.id } });
      throw error;
    }
  }

  async consume(token: string, password: string): Promise<void> {
    const hashedPassword = await HashUtil.hashPassword(password);
    await prisma.$transaction(async (tx) => {
      const record = await tx.adminPasswordResetToken.findUnique({ where: { tokenHash: digest(token) } });
      if (!record || record.usedAt || record.expiresAt <= new Date()) throw invalidLink();
      const admin = await tx.admin.findUnique({ where: { id: record.adminId } });
      if (!admin || admin.status !== AdminStatus.ACTIVE || admin.email !== record.email || digest(admin.password) !== record.passwordDigest) throw invalidLink();
      const claimed = await tx.adminPasswordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw invalidLink();
      const updated = await tx.admin.updateMany({
        where: { id: admin.id, email: record.email, password: admin.password, status: AdminStatus.ACTIVE },
        data: { password: hashedPassword, passwordChangedAt: new Date() },
      });
      if (updated.count !== 1) throw invalidLink();
      await tx.adminPasswordResetToken.updateMany({ where: { adminId: admin.id, usedAt: null }, data: { usedAt: new Date() } });
    });
  }
}
