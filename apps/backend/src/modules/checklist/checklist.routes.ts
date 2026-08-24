import { Router } from 'express';
import { ChecklistController } from './checklist.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const checklistController = new ChecklistController();

// Customer routes (authenticated customers can view checklist structure)
router.get('/structure/customer', AuthMiddleware.authenticate, checklistController.getChecklistStructure);

// Read-only routes (staff can view)
router.get('/structure', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getChecklistStructure);
router.get('/categories/enabled', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getEnabledCategories);
router.get('/categories', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getCategories);
router.get('/categories/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getCategoryById);
router.get('/items', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getItems);
router.get('/items/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getItemById);
router.get('/categories/:categoryId/items', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), checklistController.getItemsByCategory);

// Categories management (managers and above)
//
// ATENCAO: `/reorder` precisa vir ANTES de `/:id`. O Express casa na ordem de
// declaracao, entao com `/:id` na frente o pedido de reordenacao chegava ao
// updateCategory com id="reorder" e morria no Zod como UUID invalido.
router.put('/categories/reorder', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.updateCategoriesOrder);
router.post('/categories', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.createCategory);
router.put('/categories/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.updateCategory);
router.delete('/categories/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), checklistController.deleteCategory);

// Items management (managers and above) - mesma regra: `/reorder` antes de `/:id`.
router.put('/items/reorder', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.updateItemsOrder);
router.post('/items', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.createItem);
router.put('/items/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), checklistController.updateItem);
router.delete('/items/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), checklistController.deleteItem);

export default router;
