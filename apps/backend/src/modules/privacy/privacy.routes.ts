import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { PrivacyController } from './privacy.controller.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const controller = new PrivacyController();

router.get('/notice', controller.getNotice);
router.post('/consents', rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), controller.recordConsent);
router.get('/me/export', AuthMiddleware.authenticate, controller.exportMyData);
router.get('/me/requests', AuthMiddleware.authenticate, controller.listMyRequests);
router.post('/me/requests', AuthMiddleware.authenticate, controller.createRequest);

const manager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const admin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];
router.get('/admin/requests', ...manager, controller.listRequests);
router.patch('/admin/requests/:id', ...manager, controller.updateRequest);
router.get('/admin/incidents', ...admin, controller.listIncidents);
router.post('/admin/incidents', ...admin, controller.createIncident);
router.patch('/admin/incidents/:id', ...admin, controller.updateIncident);

export default router;
