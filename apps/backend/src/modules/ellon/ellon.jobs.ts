import { logger } from '@shared/utils/logger.util.js';
import { ellonJobService } from './ellon-job.service.js';

const INTERVAL_MS = 30_000;
let timer: NodeJS.Timeout | null = null;

export function startEllonJobs(): void {
  if (timer) return;
  timer = setInterval(() => void ellonJobService.processPending(), INTERVAL_MS);
  timer.unref?.();
  void ellonJobService.processPending();
  logger.info('[Ellon] processador de outbox iniciado');
}

export function stopEllonJobs(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
