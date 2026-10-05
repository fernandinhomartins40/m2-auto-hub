import { EllonJobStatus, EllonJobType } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { AmbiguousEllonError } from './ellon.client.js';
import { ellonExportService } from './ellon-export.service.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';

export class EllonJobService {
  private running = false;

  async processPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const jobs = await prisma.ellonJob.findMany({
        where: { status: { in: [EllonJobStatus.PENDING, EllonJobStatus.FAILED] }, nextAttemptAt: { lte: new Date() } },
        orderBy: { createdAt: 'asc' },
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
          } else if (job.type === EllonJobType.SYNC_PRODUCTS) {
            response = await ellonProductSyncService.syncAll();
          } else {
            throw new Error(`Tipo de job ainda não suportado: ${job.type}`);
          }
          await prisma.ellonJob.update({
            where: { id: job.id },
            data: { status: EllonJobStatus.SUCCEEDED, response: response as object, processedAt: new Date(), lockedAt: null, lastError: null },
          });
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
