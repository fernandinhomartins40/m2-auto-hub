import { connectDatabase, disconnectDatabase } from '@config/database.js';
import { validateEnvironment } from '@config/validate-env.js';
import { logger } from '@shared/utils/logger.util.js';

import { ensureEssentialData } from '../bootstrap/essential-data.js';

async function main(): Promise<void> {
  try {
    logger.info('Starting production bootstrap script');

    validateEnvironment();
    await connectDatabase();
    await ensureEssentialData();

    logger.info('Production bootstrap completed successfully');
  } catch (error) {
    logger.error('Production bootstrap failed', error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

void main();
