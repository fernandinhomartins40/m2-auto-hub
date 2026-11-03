import { AdminRole, NotificationType } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import notificationsService from '../../notifications/notifications.service.js';

/** Quem cuida da loja recebe os alertas; mecanicos (STAFF) nao. */
const ALERT_ROLES: AdminRole[] = [AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.MANAGER];

/**
 * Alerta na central de notificacoes do admin. Nunca lanca: um alerta que falha
 * nao pode derrubar a importacao de uma venda nem a pausa de um anuncio.
 */
export async function notifyStore(
  type: NotificationType,
  title: string,
  message: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const admins = await prisma.admin.findMany({ where: { status: 'ACTIVE', role: { in: ALERT_ROLES } }, select: { id: true } });
    await Promise.all(admins.map(admin => notificationsService.createNotification({
      recipientType: 'ADMIN', recipientId: admin.id, type, title, message, data,
    })));
  } catch (err) {
    logger.warn('[Marketplace] falha ao notificar', { type, err: String(err) });
  }
}
