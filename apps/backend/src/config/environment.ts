import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173'),

  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform(value => value === 'true'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform(value => {
      const normalized = value?.trim();
      return normalized ? normalized : undefined;
    }),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // URL publica base da aplicacao (usada para montar redirect/callback de OAuth e webhooks).
  // Trata string vazia como ausente (o compose pode passar "" quando a var nao esta definida).
  APP_BASE_URL: z
    .preprocess(
      value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().url().optional()
    )
    .transform(value => value ?? 'http://localhost:8080'),

  // Chave de criptografia para segredos de marketplace (AES-256-GCM).
  // Deve ter 64 chars hex (32 bytes) ou ser uma string >= 16 chars (sera derivada via SHA-256).
  // Trata string vazia como ausente -> cai no fallback (JWT_SECRET).
  MARKETPLACE_ENC_KEY: z.preprocess(
    value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().min(16).optional()
  ),

  // Habilita os jobs de background do marketplace (refresh de token, reconciliacao, processamento de eventos)
  MARKETPLACE_JOBS_ENABLED: z
    .preprocess(
      value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.enum(['true', 'false']).optional()
    )
    .transform(value => value !== 'false'),

  // Retencao de dados operacionais. Ambas as tabelas crescem sem teto hoje:
  // notificacoes ja lidas e trilha de auditoria. Zero desliga a limpeza.
  NOTIFICATION_RETENTION_DAYS: z
    .preprocess(
      value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().optional()
    )
    .transform(value => (value === undefined ? 90 : Number(value)))
    .pipe(z.number().int().min(0)),

  AUDIT_LOG_RETENTION_DAYS: z
    .preprocess(
      value => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.string().optional()
    )
    .transform(value => (value === undefined ? 365 : Number(value)))
    .pipe(z.number().int().min(0)),
});

const env = envSchema.parse(process.env);

export const environment = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  database: {
    url: env.DATABASE_URL,
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },

  bcrypt: {
    rounds: env.BCRYPT_ROUNDS,
  },

  cors: {
    origins: env.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },

  cookies: {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  },

  logging: {
    level: env.LOG_LEVEL,
  },

  app: {
    baseUrl: env.APP_BASE_URL.replace(/\/$/, ''),
  },

  marketplace: {
    encryptionKey: env.MARKETPLACE_ENC_KEY ?? env.JWT_SECRET,
    jobsEnabled: env.MARKETPLACE_JOBS_ENABLED,
  },

  retention: {
    notificationDays: env.NOTIFICATION_RETENTION_DAYS,
    auditLogDays: env.AUDIT_LOG_RETENTION_DAYS,
  },
} as const;

export type Environment = typeof environment;
