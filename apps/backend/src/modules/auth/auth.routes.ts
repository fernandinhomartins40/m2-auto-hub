import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AdminAuthController } from './admin-auth.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AdminRole } from '@prisma/client';
import { loginLimiter, createUserLimiter } from '@middlewares/rate-limit.middleware.js';
import { AuditLogMiddleware } from '@middlewares/audit-log.middleware.js';

const router = Router();
const authController = new AuthController();
const adminAuthController = new AdminAuthController();

// Customer public routes (✅ with rate limiting)
router.post('/login', loginLimiter, authController.login);
router.post('/register', createUserLimiter, authController.register);
router.post('/logout', authController.logout);

// Customer protected routes
router.get('/profile', AuthMiddleware.authenticate, authController.getProfile);
router.put('/profile', AuthMiddleware.authenticate, authController.updateProfile);
router.put('/change-password', AuthMiddleware.authenticate, authController.changePassword);

// Admin public routes (✅ with strict rate limiting)
router.post('/admin/login', loginLimiter, adminAuthController.login);
router.post('/admin/logout', adminAuthController.logout);

// Admin protected routes
router.get('/admin/profile', AdminAuthMiddleware.authenticate, adminAuthController.getProfile);
router.put('/admin/profile', AdminAuthMiddleware.authenticate, adminAuthController.updateProfile);
router.put('/admin/change-password', AdminAuthMiddleware.authenticate, adminAuthController.changePassword);
router.get('/admin/stats', AdminAuthMiddleware.authenticate, adminAuthController.getMechanicStats);
router.get('/admin/activity-history', AdminAuthMiddleware.authenticate, adminAuthController.getActivityHistory);
router.get('/admin/preferences', AdminAuthMiddleware.authenticate, adminAuthController.getPreferences);
router.put('/admin/preferences', AdminAuthMiddleware.authenticate, adminAuthController.updatePreferences);

// Admin user management (ADMIN and SUPER_ADMIN only)
router.post(
  '/admin/users',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN),
  createUserLimiter,
  AuditLogMiddleware.log('CREATE', 'Admin'), // ✅ Audit log
  adminAuthController.createAdmin
);

router.get(
  '/admin/users',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN),
  adminAuthController.getAllAdmins
);

router.put(
  '/admin/users/:id',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN),
  AuditLogMiddleware.log('UPDATE', 'Admin'), // ✅ Audit log
  adminAuthController.updateAdmin
);

router.delete(
  '/admin/users/:id',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.SUPER_ADMIN),
  AuditLogMiddleware.log('DELETE', 'Admin'), // ✅ Audit log
  adminAuthController.deleteAdmin
);

export default router;
