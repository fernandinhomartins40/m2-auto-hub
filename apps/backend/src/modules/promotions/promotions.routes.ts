import { Router } from 'express';
import { PromotionsController } from './promotions.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const promotionsController = new PromotionsController();

// Public routes
router.get('/active', promotionsController.getActivePromotions);
router.get('/code/:code', promotionsController.getPromotionByCode);
router.post('/calculate', promotionsController.calculatePromotions);

// Admin routes (for creating/managing promotions)
router.post('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.createPromotion);
router.get('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), promotionsController.getPromotions);
router.get('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), promotionsController.getPromotionById);
router.patch('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.updatePromotion);
router.delete('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), promotionsController.deletePromotion);

// Promotion actions
router.post('/:id/activate', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.activatePromotion);
router.post('/:id/deactivate', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.deactivatePromotion);
router.get('/:id/stats', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), promotionsController.getPromotionStats);

export default router;
