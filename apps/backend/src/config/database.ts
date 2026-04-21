import { PrismaClient } from '@prisma/client';
import { environment } from './environment.js';
import { logger } from '@shared/utils/logger.util.js';

// Prisma Client Singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: environment.isDevelopment
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
    errorFormat: 'pretty',
  });

if (environment.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

// Database connection handler
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Database disconnection handler
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database:', error);
  }
}

// Graceful shutdown handlers
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
