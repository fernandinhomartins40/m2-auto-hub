import { connectDatabase, disconnectDatabase } from '@config/database.js';
import { validateEnvironment } from '@config/validate-env.js';
import { logger } from '@shared/utils/logger.util.js';

import { ensureDemoData } from '../bootstrap/demo-data.js';
import { ensureEssentialData } from '../bootstrap/essential-data.js';

async function main(): Promise<void> {
  let exitCode = 0;

  try {
    logger.info('Starting production bootstrap script');

    validateEnvironment();
    await connectDatabase();
    await ensureEssentialData();
    if (process.env.SEED_DEMO_DATA !== 'false') {
      await ensureDemoData();
    }

    logger.info('Production bootstrap completed successfully');
  } catch (error) {
    logger.error('Production bootstrap failed', error);
    exitCode = 1;
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
    process.exit(exitCode);
  }
}

void main();
