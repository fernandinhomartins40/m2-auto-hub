import { logger } from '@shared/utils/logger.util.js';
import { ellonJobService } from './ellon-job.service.js';
import { prisma } from '@config/database.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';
import { ellonMasterSyncService } from './ellon-master-sync.service.js';
import { ellonExportService } from './ellon-export.service.js';
import { EllonEntityType, OrderStatus, ServiceOrderStatus } from '@prisma/client';

const INTERVAL_MS = 30_000;
let timer: NodeJS.Timeout | null = null;

export function startEllonJobs(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scheduleEnabledSyncs().finally(() => ellonJobService.processPending());
  }, INTERVAL_MS);
  timer.unref?.();
  void ellonJobService.recoverInterrupted()
    .then(scheduleEnabledSyncs)
    .then(() => ellonJobService.processPending())
    .catch(error => logger.error('[Ellon] falha ao iniciar sincronização automática', { error: String(error) }));
  logger.info('[Ellon] processador de outbox iniciado');
}

async function scheduleEnabledSyncs(): Promise<void> {
  const connection = await prisma.ellonConnection.findUnique({ where: { id: 'default' } });
  if (!connection?.enabled) return;
  await ellonMasterSyncService.enqueueReferences();
  if (connection.syncProducts) await ellonProductSyncService.enqueue();
  if (connection.syncCustomers) await ellonMasterSyncService.enqueueCustomers();
  if (connection.syncOrders) {
    await ellonMasterSyncService.enqueueOrders();
    await enqueueReadyServiceOrders();
    await enqueueReadyOrders();
  }
}

async function enqueueReadyOrders(): Promise<void> {
  const candidates = await prisma.order.findMany({
    where: { status: OrderStatus.CONFIRMED }, select: { id: true }, orderBy: { updatedAt: 'asc' }, take: 100,
  });
  if (!candidates.length) return;
  const exported = await prisma.ellonEntityLink.findMany({
    where: { entityType: EllonEntityType.ORDER, localId: { in: candidates.map(item => item.id) } }, select: { localId: true },
  });
  const exportedIds = new Set(exported.map(item => item.localId));
  for (const candidate of candidates) {
    if (exportedIds.has(candidate.id)) continue;
    try { await ellonExportService.enqueueOrder(candidate.id); } catch { /* aguarda mapeamentos/configuração */ }
  }
}

async function enqueueReadyServiceOrders(): Promise<void> {
  const candidates = await prisma.serviceOrder.findMany({
    where: { status: ServiceOrderStatus.COMPLETED, customerId: { not: null } },
    select: { id: true }, orderBy: { updatedAt: 'asc' }, take: 100,
  });
  if (!candidates.length) return;
  const exported = await prisma.ellonEntityLink.findMany({
    where: { entityType: EllonEntityType.SERVICE_ORDER, localId: { in: candidates.map(item => item.id) } },
    select: { localId: true },
  });
  const exportedIds = new Set(exported.map(item => item.localId));
  for (const candidate of candidates) {
    if (exportedIds.has(candidate.id)) continue;
    try { await ellonExportService.enqueueServiceOrder(candidate.id); } catch { /* aguarda os mapeamentos/configuração necessários */ }
  }
}

export function stopEllonJobs(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
