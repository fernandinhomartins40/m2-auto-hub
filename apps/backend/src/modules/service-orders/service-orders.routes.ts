import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AuditLogMiddleware } from '@middlewares/audit-log.middleware.js';
import { serviceOrdersController } from './service-orders.controller.js';

const router = Router();

const staff = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF)];
const manager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const admin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];

// Leitura (STAFF+)
router.get('/statistics', ...staff, serviceOrdersController.getStatistics);
router.get('/mechanic/:mechanicId', ...staff, serviceOrdersController.getByMechanic);
router.get('/', ...staff, serviceOrdersController.getAll);
router.get('/:id', ...staff, serviceOrdersController.getById);

// Criacao/edicao (STAFF+)
router.post('/', ...staff, serviceOrdersController.create);
router.put('/:id', ...staff, serviceOrdersController.update);

// Fluxo de status (STAFF+ inicia/conclui; cancelar exige MANAGER+)
router.patch('/:id/start', ...staff, serviceOrdersController.start);
router.patch('/:id/complete', ...staff, serviceOrdersController.complete);
router.patch('/:id/cancel', ...manager, serviceOrdersController.cancel);

// Atribuicao de mecanico (MANAGER+, com AuditLog)
router.post(
  '/:id/assign-mechanic',
  ...manager,
  AuditLogMiddleware.log('ASSIGN_MECHANIC', 'ServiceOrder'),
  serviceOrdersController.assignMechanic
);
router.delete(
  '/:id/unassign-mechanic',
  ...manager,
  AuditLogMiddleware.log('UNASSIGN_MECHANIC', 'ServiceOrder'),
  serviceOrdersController.unassignMechanic
);

// Exclusao (ADMIN+)
router.delete('/:id', ...admin, AuditLogMiddleware.log('DELETE', 'ServiceOrder'), serviceOrdersController.remove);

export default router;
