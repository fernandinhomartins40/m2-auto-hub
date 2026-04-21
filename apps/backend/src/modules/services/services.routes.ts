import { Router } from 'express';
import { ServicesController } from './services.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const servicesController = new ServicesController();

// Public routes
router.get('/', servicesController.getServices);
router.get('/categories/list', servicesController.getCategories);
router.get('/slug/:slug', servicesController.getServiceBySlug);
router.get('/category/:category', servicesController.getServicesByCategory);

// Protected routes (admin only)
router.get('/categories', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), servicesController.getManagedCategories);
router.post('/categories', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.createCategory);
router.patch('/categories/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.updateCategory);
router.post('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.createService);
router.put('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.updateService);
router.delete('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), servicesController.deleteService);
router.get('/:id', servicesController.getServiceById);

export default router;
