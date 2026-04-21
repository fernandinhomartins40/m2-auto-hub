import { logger } from '@shared/utils/logger.util.js';

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL nao esta definida');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET nao esta definida');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  if (!process.env.PORT) {
    errors.push('PORT nao esta definida');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET?.includes('dev_2024') || process.env.JWT_SECRET?.includes('dev_2026')) {
      errors.push('JWT_SECRET de desenvolvimento sendo usado em production');
    }

    if (process.env.DATABASE_URL?.includes('postgres:postgres')) {
      errors.push('Credenciais padrao de database sendo usadas em production');
    }

    if (!process.env.CORS_ORIGIN) {
      warnings.push('CORS_ORIGIN nao esta definida em production');
    }

    if (process.env.LOG_LEVEL === 'debug') {
      warnings.push('LOG_LEVEL esta em debug em production');
    }
  }

  if (!process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN nao esta definida. Usando valor padrao.');
  }

  if (process.env.COOKIE_SAME_SITE === 'none' && process.env.COOKIE_SECURE !== 'true') {
    warnings.push('COOKIE_SAME_SITE=none exige COOKIE_SECURE=true em navegadores modernos');
  }

  if (errors.length > 0) {
    logger.error('Configuration errors detected:');
    errors.forEach(error => logger.error(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    logger.warn('Configuration warnings:');
    warnings.forEach(warning => logger.warn(`  - ${warning}`));
  }

  logger.info('Environment validation completed successfully');
  logger.info(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Porta: ${process.env.PORT || '3001'}`);
  logger.info(`   CORS: ${process.env.CORS_ORIGIN || 'padrao'}`);
  logger.info(`   Cookie secure: ${process.env.COOKIE_SECURE || 'false'}`);
  logger.info('');
}
