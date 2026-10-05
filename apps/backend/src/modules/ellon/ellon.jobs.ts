import { logger } from '@shared/utils/logger.util.js';
import { ellonJobService } from './ellon-job.service.js';
import { prisma } from '@config/database.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';

const INTERVAL_MS = 30_000;
let timer: NodeJS.Timeout | null = null;

export function startEllonJobs(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scheduleEnabledSyncs().finally(() => ellonJobService.processPending());
  }, INTERVAL_MS);
  timer.unref?.();
  void ellonJobService.processPending();
  logger.info('[Ellon] processador de outbox iniciado');
}

async function scheduleEnabledSyncs(): Promise<void> {
  const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
  if (connection?.enabled && connection.syncProducts) await ellonProductSyncService.enqueue();
}

export function stopEllonJobs(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
