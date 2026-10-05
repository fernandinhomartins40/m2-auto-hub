import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AuditLogMiddleware } from '@middlewares/audit-log.middleware.js';
import { ellonController } from './ellon.controller.js';

const router = Router();
const staff = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF)];
const manager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const admin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];

router.get('/config', ...staff, ellonController.getConfig);
router.put('/config', ...admin, AuditLogMiddleware.log('UPDATE', 'EllonConnection'), ellonController.updateConfig);
router.post('/test', ...admin, ellonController.test);
router.post('/sync/products', ...manager, AuditLogMiddleware.log('SYNC', 'EllonProducts'), ellonController.syncProducts);

router.get('/links', ...staff, ellonController.listLinks);
router.put('/links', ...manager, AuditLogMiddleware.log('UPSERT', 'EllonEntityLink'), ellonController.upsertLink);
router.delete('/links/:id', ...manager, AuditLogMiddleware.log('DELETE', 'EllonEntityLink'), ellonController.removeLink);

router.get('/service-orders/:id/preflight', ...staff, ellonController.preflightServiceOrder);
router.post(
  '/service-orders/:id/export',
  ...manager,
  AuditLogMiddleware.log('EXPORT', 'ServiceOrder'),
  ellonController.exportServiceOrder
);

router.get('/jobs', ...staff, ellonController.listJobs);
router.post('/jobs/:id/retry', ...manager, AuditLogMiddleware.log('RETRY', 'EllonJob'), ellonController.retryJob);

export default router;
