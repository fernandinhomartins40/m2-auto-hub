import { Router, Request, Response, NextFunction } from 'express';
import { AdminRole } from '@prisma/client';
import { z } from 'zod';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { aiService } from './ai.service.js';

const router = Router();
const manager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const admin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().max(200).optional(),
  model: z.string().max(60).optional(),
  monthlyBudgetBrl: z.number().min(0).max(100000).optional(),
});

function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, data: await fn(req) });
    } catch (error) {
      next(error);
    }
  };
}

// Gerente ve consumo; so administrador troca chave, modelo e limite.
router.get('/settings', ...manager, handle(() => aiService.getSettings()));
router.put('/settings', ...admin, handle(req => aiService.updateSettings(settingsSchema.parse(req.body))));
router.post('/test', ...admin, handle(() => aiService.test()));

export default router;
