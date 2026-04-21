import { Router } from 'express';
import { RevisionsController } from './revisions.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AuditLogMiddleware } from '@middlewares/audit-log.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const revisionsController = new RevisionsController();

// Statistics (all staff can view)
router.get('/statistics', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.getStatistics);

// Vehicle history (all staff can view)
router.get('/vehicle/:vehicleId/history', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.getVehicleHistory);

// Mechanic workload (managers can view all)
router.get('/mechanics/workload', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), revisionsController.getAllMechanicsWorkload);

// Revisions by mechanic (all staff can view)
router.get('/mechanic/:mechanicId', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.getRevisionsByMechanic);

// Read operations (all staff can view)
router.get('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.getRevisions);
router.get('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.getRevisionById);
router.post('/:id/export-pdf', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.exportRevisionPdf);

// Create/Update operations (staff can create and update revisions)
router.post('/', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.createRevision);
router.put('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.updateRevision);

// Status changes (staff can manage revision status)
router.patch('/:id/start', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.startRevision);
router.patch('/:id/complete', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), revisionsController.completeRevision);
router.patch('/:id/cancel', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), revisionsController.cancelRevision);

// Mechanic assignment (managers can assign/transfer) - ✅ with audit log
router.post('/:id/assign-mechanic', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), AuditLogMiddleware.log('ASSIGN_MECHANIC', 'Revision'), revisionsController.assignMechanic);
router.post('/:id/transfer-mechanic', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), AuditLogMiddleware.log('TRANSFER_MECHANIC', 'Revision'), revisionsController.transferMechanic);
router.delete('/:id/unassign-mechanic', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), AuditLogMiddleware.log('UNASSIGN_MECHANIC', 'Revision'), revisionsController.unassignMechanic);

// Delete operations (only managers and above) - ✅ with audit log
router.delete('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), AuditLogMiddleware.log('DELETE', 'Revision'), revisionsController.deleteRevision);

export default router;
