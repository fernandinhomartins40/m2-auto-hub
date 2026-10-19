import { logger } from '@shared/utils/logger.util.js';
import { ellonJobService } from './ellon-job.service.js';
import { prisma } from '@config/database.js';
import { ellonProductSyncService } from './ellon-product-sync.service.js';
import { ellonMasterSyncService } from './ellon-master-sync.service.js';
import { ellonExportService } from './ellon-export.service.js';
import { EllonEntityType, EllonJobType, OrderSource, OrderStatus, ServiceOrderStatus } from '@prisma/client';

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
  if (connection.syncCustomers) {
    await ellonMasterSyncService.enqueueCustomers();
    await ellonExportService.scanCustomerChanges().catch(error =>
      logger.warn('[Ellon] falha ao detectar clientes alterados no M2', { error: String(error) }));
  }
  if (connection.syncOrders) {
    await ellonMasterSyncService.enqueueOrders();
    await enqueueReadyServiceOrders();
    await enqueueReadyOrders(connection.exportOrderSources);
  }
}

// Pendências mais antigas que isso exigem envio manual pelo painel (evita revalidar o histórico a cada ciclo).
const recent = () => new Date(Date.now() - 30 * 24 * 60 * 60_000);

/** Registros que já têm envio (job) ou vínculo: não voltam a ocupar a janela de candidatos. */
async function handledIds(jobType: EllonJobType, entityType: EllonEntityType): Promise<string[]> {
  const [jobs, links] = await Promise.all([
    prisma.ellonJob.findMany({ where: { type: jobType, localEntityId: { not: null } }, select: { localEntityId: true } }),
    prisma.ellonEntityLink.findMany({ where: { entityType }, select: { localId: true } }),
  ]);
  return [...new Set([...jobs.map(job => job.localEntityId as string), ...links.map(link => link.localId)])];
}

async function enqueueReadyOrders(sources: OrderSource[]): Promise<void> {
  if (!sources.length) return;
  const handled = await handledIds(EllonJobType.EXPORT_ORDER, EllonEntityType.ORDER);
  const candidates = await prisma.order.findMany({
    where: { status: OrderStatus.CONFIRMED, source: { in: sources }, id: { notIn: handled }, updatedAt: { gte: recent() } },
    select: { id: true }, orderBy: { updatedAt: 'desc' }, take: 50,
  });
  for (const candidate of candidates) {
    try { await ellonExportService.enqueueOrder(candidate.id); } catch { /* aguarda mapeamentos/configuração */ }
  }
}

async function enqueueReadyServiceOrders(): Promise<void> {
  const handled = await handledIds(EllonJobType.EXPORT_SERVICE_ORDER, EllonEntityType.SERVICE_ORDER);
  const candidates = await prisma.serviceOrder.findMany({
    // Sem cliente, a pré-validação decide (cliente consumidor final configurado ou não).
    where: { status: ServiceOrderStatus.COMPLETED, id: { notIn: handled }, updatedAt: { gte: recent() } },
    select: { id: true }, orderBy: { updatedAt: 'desc' }, take: 50,
  });
  for (const candidate of candidates) {
    try { await ellonExportService.enqueueServiceOrder(candidate.id); } catch { /* aguarda os mapeamentos/configuração necessários */ }
  }
}

export function stopEllonJobs(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
