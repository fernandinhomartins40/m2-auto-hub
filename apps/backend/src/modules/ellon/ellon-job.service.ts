import { EllonJobStatus, EllonJobType } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { AmbiguousEllonError } from './ellon.client.js';
import { ellonExportService } from './ellon-export.service.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';
import { ellonMasterSyncService } from './ellon-master-sync.service.js';

export class EllonJobService {
  private running = false;

  async recoverInterrupted(): Promise<void> {
    await prisma.ellonJob.updateMany({
      where: { status: EllonJobStatus.PROCESSING },
      data: {
        status: EllonJobStatus.FAILED,
        lockedAt: null,
        nextAttemptAt: new Date(),
        lastError: 'Processamento interrompido por reinicialização; reagendado automaticamente.',
      },
    });
  }

  async processPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await prisma.ellonJob.findMany({
        where: { status: EllonJobStatus.PENDING, nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });
      const jobs = pending.length ? pending : await prisma.ellonJob.findMany({
        where: { status: EllonJobStatus.FAILED, nextAttemptAt: { lte: new Date() } },
        orderBy: { nextAttemptAt: 'asc' },
        take: 5,
      });
      for (const job of jobs) {
        const claimed = await prisma.ellonJob.updateMany({
          where: { id: job.id, status: job.status },
          data: { status: EllonJobStatus.PROCESSING, lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (claimed.count !== 1) continue;
        try {
          let response: unknown;
          if (job.type === EllonJobType.EXPORT_SERVICE_ORDER && job.localEntityId) {
            response = await ellonExportService.exportServiceOrder(job.localEntityId);
          } else if (job.type === EllonJobType.EXPORT_ORDER && job.localEntityId) {
            response = await ellonExportService.exportOrder(job.localEntityId);
          } else if (job.type === EllonJobType.SYNC_PRODUCTS) {
            response = await ellonProductSyncService.syncAll();
          } else if (job.type === EllonJobType.SYNC_CUSTOMERS) {
            response = await ellonMasterSyncService.syncCustomers();
          } else if (job.type === EllonJobType.SYNC_REFERENCE_DATA) {
            response = await ellonMasterSyncService.syncReferences();
          } else if (job.type === EllonJobType.SYNC_ORDER_STATUS) {
            response = await ellonMasterSyncService.syncOrders();
          } else {
            throw new Error(`Tipo de job ainda não suportado: ${job.type}`);
          }
          await prisma.ellonJob.update({
            where: { id: job.id },
            data: { status: EllonJobStatus.SUCCEEDED, response: response as object, processedAt: new Date(), lockedAt: null, lastError: null },
          });
          const synchronizationTypes: EllonJobType[] = [
            EllonJobType.SYNC_PRODUCTS,
            EllonJobType.SYNC_CUSTOMERS,
            EllonJobType.SYNC_REFERENCE_DATA,
            EllonJobType.SYNC_ORDER_STATUS,
          ];
          if (synchronizationTypes.includes(job.type)) {
            await prisma.ellonJob.updateMany({
              where: {
                id: { not: job.id },
                type: job.type,
                status: { in: [EllonJobStatus.PENDING, EllonJobStatus.FAILED] },
              },
              data: {
                status: EllonJobStatus.CANCELLED,
                processedAt: new Date(),
                lockedAt: null,
                lastError: 'Substituído por uma sincronização mais recente concluída com sucesso.',
              },
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const ambiguous = error instanceof AmbiguousEllonError;
          const exhausted = job.attempts + 1 >= job.maxAttempts;
          const delayMinutes = Math.min(60, 2 ** Math.min(job.attempts, 5));
          await prisma.ellonJob.update({
            where: { id: job.id },
            data: {
              status: EllonJobStatus.FAILED,
              lastError: message.slice(0, 2000),
              lockedAt: null,
              nextAttemptAt: ambiguous || exhausted
                ? new Date('9999-12-31T00:00:00.000Z')
                : new Date(Date.now() + delayMinutes * 60_000),
            },
          });
          logger.warn('[Ellon] job falhou', { jobId: job.id, ambiguous, message });
        }
      }
    } finally {
      this.running = false;
    }
  }

  async retry(id: string) {
    const job = await prisma.ellonJob.findUnique({ where: { id } });
    if (!job) throw new Error('Job Ellon não encontrado.');
    if (job.status !== EllonJobStatus.FAILED) throw new Error('Somente jobs com falha podem ser reenfileirados.');
    return prisma.ellonJob.update({
      where: { id: job.id },
      data: { status: EllonJobStatus.PENDING, nextAttemptAt: new Date(), lockedAt: null, lastError: null },
    });
  }
}

export const ellonJobService = new EllonJobService();
