import { Router } from 'express';
import { CouponsController } from './coupons.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const couponsController = new CouponsController();

// Public routes (customers can validate coupons)
router.post('/validate', AuthMiddleware.authenticate, couponsController.validateCoupon);
router.get('/active', couponsController.getActiveCoupons);
router.get('/active/count', couponsController.getActiveCouponCount);
router.get('/customer-available', couponsController.getCustomerAvailableCoupons); // ✅ ETAPA 3.1: Novo endpoint

// Admin routes (for creating/managing coupons)
router.post('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.createCoupon);
router.get('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), couponsController.getCoupons);
router.get('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), couponsController.getCouponById);
router.patch('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.updateCoupon);
router.delete('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), couponsController.deleteCoupon);

// Coupon actions
router.post('/:id/activate', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.activateCoupon);
router.post('/:id/deactivate', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.deactivateCoupon);
router.get('/:id/stats', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), couponsController.getCouponStats);

export default router;
