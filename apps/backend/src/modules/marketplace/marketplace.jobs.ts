import { environment } from '@config/environment.js';
import { logger } from '@shared/utils/logger.util.js';
import { connectionService } from './services/connection.service.js';
import { tokenRefreshService } from './services/token-refresh.service.js';
import { syncService } from './services/sync.service.js';
import { eventProcessorService } from './services/event-processor.service.js';
import { mlOrderService } from './services/ml-order.service.js';
import { mlAiService } from './services/ml-ai.service.js';

const EVENT_INTERVAL_MS = 30 * 1000; // 30s: processa eventos de webhook pendentes
const TOKEN_INTERVAL_MS = 5 * 60 * 1000; // 5min: renova tokens proximos de expirar
// 2min: estoque/preco mudados pelo Ellon, site e OS chegam ao marketplace (consulta unica, so envia o que mudou)
const RECONCILE_INTERVAL_MS = 2 * 60 * 1000;
const ORDERS_INTERVAL_MS = 10 * 60 * 1000; // 10min: vendas do ML sem aviso, envios e prazos
const AI_QUEUE_INTERVAL_MS = 30 * 1000; // 30s: preparo de anuncios com IA em lote (retoma apos reinicio)

const timers: NodeJS.Timeout[] = [];

/**
 * Inicializa os jobs de background do modulo marketplace.
 * Sao timers leves (sem dependencia de Redis). Em escala, migrar para BullMQ.
 */
export async function startMarketplaceJobs(): Promise<void> {
  await connectionService.ensureAll().catch(err => logger.warn('[Marketplace] ensureAll falhou', { err: String(err) }));

  if (!environment.marketplace.jobsEnabled) {
    logger.info('[Marketplace] jobs de background desabilitados (MARKETPLACE_JOBS_ENABLED=false)');
    return;
  }

  timers.push(
    setInterval(() => {
      void eventProcessorService.processPending();
    }, EVENT_INTERVAL_MS)
  );

  timers.push(
    setInterval(() => {
      void tokenRefreshService.refreshExpiring();
    }, TOKEN_INTERVAL_MS)
  );

  timers.push(
    setInterval(() => {
      void syncService.reconcile();
    }, RECONCILE_INTERVAL_MS)
  );

  timers.push(
    setInterval(() => {
      void mlAiService.processQueue().catch(err =>
        logger.warn('[Marketplace] fila da IA falhou', { err: String(err) })
      );
    }, AI_QUEUE_INTERVAL_MS)
  );

  timers.push(
    setInterval(() => {
      void mlOrderService.pollRecent().catch(err =>
        logger.warn('[Marketplace] conferencia de vendas falhou', { err: String(err) })
      );
    }, ORDERS_INTERVAL_MS)
  );

  // Evita segurar o event loop / impedir shutdown
  timers.forEach(t => t.unref?.());

  logger.info('[Marketplace] jobs de background iniciados');
}

export function stopMarketplaceJobs(): void {
  while (timers.length) {
    const t = timers.pop();
    if (t) clearInterval(t);
  }
}
