import { createApp } from './app.js';
import { environment } from '@config/environment.js';
import { connectDatabase, disconnectDatabase } from '@config/database.js';
import { logger } from '@shared/utils/logger.util.js';
import { validateEnvironment } from '@config/validate-env.js';
import { setupPrismaRLS } from '@middlewares/prisma-rls.middleware.js';

async function bootstrap(): Promise<void> {
  try {
    logger.info('🔄 Starting bootstrap process...');

    // Validate environment variables first
    logger.info('📋 Validating environment variables...');
    validateEnvironment();
    logger.info('✅ Environment variables validated');

    // Connect to database
    logger.info('🔌 Connecting to database...');
    await connectDatabase();
    logger.info('✅ Database connected');

    // Setup Prisma Row-Level Security middleware
    logger.info('🔐 Setting up Prisma RLS middleware...');
    await setupPrismaRLS();
    logger.info('✅ Prisma RLS middleware initialized');

    // Create Express app
    logger.info('⚙️  Creating Express application...');
    const app = createApp();
    logger.info('✅ Express app created');

    // Start server
    const server = app.listen(environment.port, () => {
      logger.info(`🚀 Server running on port ${environment.port}`);
      logger.info(`📝 Environment: ${environment.nodeEnv}`);
      logger.info(`🔗 Health check: http://localhost:${environment.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ FATAL ERROR - Failed to start server');
    logger.error('Error details:', error);

    if (error instanceof Error) {
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    }

    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

bootstrap();

