import { EllonJob, EllonJobStatus, EllonJobType, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { AmbiguousEllonError } from './ellon.client.js';
import { ellonExportService } from './ellon-export.service.js';
import { ProductSyncProgress, ellonProductSyncService } from './ellon-product-sync.service.js';
import { PagedProgress, ellonMasterSyncService } from './ellon-master-sync.service.js';
import { ellonContractService } from './ellon-contract.service.js';
import { ellonStoreService } from './ellon-store.service.js';

const payloadOf = (job: EllonJob): Record<string, unknown> =>
  job.payload && typeof job.payload === 'object' && !Array.isArray(job.payload) ? job.payload as Record<string, unknown> : {};

export const PARKED_UNTIL = new Date('9999-12-31T00:00:00.000Z');

const SYNC_TYPES: EllonJobType[] = [
  EllonJobType.SYNC_PRODUCTS,
  EllonJobType.SYNC_CUSTOMERS,
  EllonJobType.SYNC_REFERENCE_DATA,
  EllonJobType.SYNC_ORDER_STATUS,
];

export class EllonJobService {
  private running = false;

  /** Persiste o progresso no payload: uma nova tentativa continua da página onde parou. */
  private checkpoint(job: EllonJob) {
    return async (progress: unknown) => {
      await prisma.ellonJob.update({
        where: { id: job.id },
        data: { payload: { ...payloadOf(job), progress } as Prisma.InputJsonValue, lockedAt: new Date() },
      });
    };
  }

  private async run(job: EllonJob): Promise<unknown> {
    const payload = payloadOf(job);
    const progress = payload.progress ?? null;
    const checkpoint = this.checkpoint(job);
    switch (job.type) {
      case EllonJobType.EXPORT_SERVICE_ORDER:
        if (!job.localEntityId) break;
        return ellonExportService.exportServiceOrder(job.localEntityId);
      case EllonJobType.EXPORT_ORDER:
        if (!job.localEntityId) break;
        return ellonExportService.exportOrder(job.localEntityId);
      case EllonJobType.EXPORT_CUSTOMER:
        if (!job.localEntityId) break;
        return ellonExportService.exportCustomer(job.localEntityId);
      case EllonJobType.SYNC_PRODUCTS:
        return ellonProductSyncService.syncAll({ full: payload.full === true, progress: progress as ProductSyncProgress | null, checkpoint });
      case EllonJobType.SYNC_CUSTOMERS:
        return ellonMasterSyncService.syncCustomers(progress as PagedProgress | null, checkpoint);
      case EllonJobType.SYNC_REFERENCE_DATA: {
        const result = await ellonMasterSyncService.syncReferences();
        // O contrato publicado é relido diariamente; falha aqui não invalida os cadastros.
        const contract = await ellonContractService.refreshSwagger().then(() => 'atualizado').catch(error => `falhou: ${String(error)}`);
        return { ...result, contract };
      }
      case EllonJobType.SYNC_ORDER_STATUS: {
        const result = await ellonMasterSyncService.syncOrders(progress as PagedProgress | null, checkpoint);
        // Falha nos pontos não invalida a sincronização; é refeita na próxima execução (idempotente).
        const loyalty = await ellonStoreService.awardStoreSales().catch(error => ({ error: String(error) }));
        return { ...result, loyalty };
      }
    }
    throw new Error(`Job ${job.type} sem entidade local ou tipo não suportado.`);
  }

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
      // Retentativas vencidas entram junto com os pendentes para não ficarem esperando a fila esvaziar.
      const [pending, retries] = await Promise.all([
        prisma.ellonJob.findMany({
          where: { status: EllonJobStatus.PENDING, nextAttemptAt: { lte: new Date() } },
          orderBy: { createdAt: 'asc' },
          take: 5,
        }),
        prisma.ellonJob.findMany({
          where: { status: EllonJobStatus.FAILED, nextAttemptAt: { lte: new Date() } },
          orderBy: { nextAttemptAt: 'asc' },
          take: 3,
        }),
      ]);
      const jobs = [...pending, ...retries];
      for (const job of jobs) {
        const claimed = await prisma.ellonJob.updateMany({
          where: { id: job.id, status: job.status },
          data: { status: EllonJobStatus.PROCESSING, lockedAt: new Date(), attempts: { increment: 1 } },
        });
        if (claimed.count !== 1) continue;
        try {
          const response = await this.run(job);
          await prisma.ellonJob.update({
            where: { id: job.id },
            data: { status: EllonJobStatus.SUCCEEDED, response: response as object, processedAt: new Date(), lockedAt: null, lastError: null },
          });
          if (SYNC_TYPES.includes(job.type)) {
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
          // Pedido com timeout pode já existir na Ellon: só reenvia após conciliação. Cadastro de
          // cliente é reconciliado pela importação (CPF/e-mail) e pode ser retentado mais tarde.
          const ambiguous = error instanceof AmbiguousEllonError && job.type !== EllonJobType.EXPORT_CUSTOMER;
          const exhausted = job.attempts + 1 >= job.maxAttempts && !SYNC_TYPES.includes(job.type);
          const delayMinutes = error instanceof AmbiguousEllonError ? 60 : Math.min(60, 2 ** Math.min(job.attempts, 5));
          await prisma.ellonJob.update({
            where: { id: job.id },
            data: {
              status: EllonJobStatus.FAILED,
              lastError: message.slice(0, 2000),
              lockedAt: null,
              nextAttemptAt: ambiguous || exhausted
                ? PARKED_UNTIL
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
