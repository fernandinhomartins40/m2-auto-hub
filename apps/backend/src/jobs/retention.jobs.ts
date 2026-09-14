import { environment } from '@config/environment.js';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import notificationsService from '@modules/notifications/notifications.service.js';

/**
 * Limpeza periodica de dados operacionais que hoje crescem sem teto.
 *
 * Duas tabelas nunca foram podadas: `notifications` (notificacoes ja lidas) e
 * `audit_logs` (que guarda corpo de request e resposta de cada acao). Em uma VPS
 * compartilhada, esse crescimento vira consumo de disco e queda de desempenho
 * nas proprias consultas dessas tabelas.
 *
 * As janelas sao conservadoras e configuraveis por variavel de ambiente:
 * NOTIFICATION_RETENTION_DAYS (padrao 90) e AUDIT_LOG_RETENTION_DAYS (padrao
 * 365). Definir como 0 desliga a limpeza daquela tabela. Nada e removido fora
 * da janela configurada, e notificacoes nao lidas nunca sao tocadas.
 */

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1x por dia
const STARTUP_DELAY_MS = 5 * 60 * 1000; // nao competir com o boot

const timers: NodeJS.Timeout[] = [];

async function purgeNotifications(): Promise<void> {
  const days = environment.retention.notificationDays;
  if (days <= 0) return;

  const result = await notificationsService.deleteOldNotifications(days);
  if (result.count > 0) {
    logger.info('[Retencao] notificacoes lidas removidas', { count: result.count, days });
  }
}

async function purgeAuditLogs(): Promise<void> {
  const days = environment.retention.auditLogDays;
  if (days <= 0) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    logger.info('[Retencao] registros de auditoria removidos', { count: result.count, days });
  }
}

async function runCleanup(): Promise<void> {
  try {
    await purgeNotifications();
    await purgeAuditLogs();
  } catch (err) {
    // Uma falha na limpeza nunca deve derrubar o servidor.
    logger.warn('[Retencao] falha na limpeza periodica', { err: String(err) });
  }
}

export function startRetentionJobs(): void {
  const { notificationDays, auditLogDays } = environment.retention;
  if (notificationDays <= 0 && auditLogDays <= 0) {
    logger.info('[Retencao] limpeza desabilitada (retencao configurada como 0)');
    return;
  }

  const startup = setTimeout(() => {
    void runCleanup();
  }, STARTUP_DELAY_MS);

  const daily = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);

  timers.push(startup, daily);
  timers.forEach(t => t.unref?.());

  logger.info('[Retencao] limpeza periodica agendada', { notificationDays, auditLogDays });
}

export function stopRetentionJobs(): void {
  while (timers.length) {
    const t = timers.pop();
    if (t) clearTimeout(t);
  }
}
