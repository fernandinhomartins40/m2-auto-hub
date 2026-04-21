import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';

interface RLSContext {
  adminId: string;
  adminRole: string;
}

const rlsContextStorage = new AsyncLocalStorage<RLSContext>();

export function runWithRLSContext<T>(adminId: string, adminRole: string, callback: () => T): T {
  return rlsContextStorage.run({ adminId, adminRole }, callback);
}

export function getRLSContext(): RLSContext | null {
  return rlsContextStorage.getStore() || null;
}

export async function setupPrismaRLS() {
  prisma.$use(async (params: Prisma.MiddlewareParams, next) => {
    const context = getRLSContext();

    if (params.model === 'Revision' && context) {
      try {
        await prisma.$executeRaw`
          SELECT
            set_config('app.current_user_id', ${context.adminId}, true),
            set_config('app.current_role', ${context.adminRole}, true)
        `;
      } catch (error) {
        console.warn('[RLS] Policies not enabled yet:', error);
      }
    }

    return next(params);
  });
}
