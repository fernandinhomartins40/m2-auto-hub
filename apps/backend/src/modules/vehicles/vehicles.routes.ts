import { Router } from 'express';
import { VehiclesController } from './vehicles.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const vehiclesController = new VehiclesController();

// =========================================================================
// PUBLIC ROUTES
// =========================================================================

// Utility routes
router.get('/hierarchy', vehiclesController.getVehicleHierarchy);
router.get('/search', vehiclesController.searchVehicles);

// Makes
router.get('/makes', vehiclesController.getMakes);
router.get('/makes/:id', vehiclesController.getMakeById);

// Models
router.get('/models', vehiclesController.getModels);
router.get('/models/:id', vehiclesController.getModelById);

// Variants
router.get('/variants', vehiclesController.getVariants);
router.get('/variants/:id', vehiclesController.getVariantById);

// =========================================================================
// PROTECTED ROUTES (Admin only)
// =========================================================================

// Makes
router.post('/makes', AuthMiddleware.authenticate, vehiclesController.createMake);
router.put('/makes/:id', AuthMiddleware.authenticate, vehiclesController.updateMake);
router.delete('/makes/:id', AuthMiddleware.authenticate, vehiclesController.deleteMake);

// Models
router.post('/models', AuthMiddleware.authenticate, vehiclesController.createModel);
router.put('/models/:id', AuthMiddleware.authenticate, vehiclesController.updateModel);
router.delete('/models/:id', AuthMiddleware.authenticate, vehiclesController.deleteModel);

// Variants
router.post('/variants', AuthMiddleware.authenticate, vehiclesController.createVariant);
router.put('/variants/:id', AuthMiddleware.authenticate, vehiclesController.updateVariant);
router.delete('/variants/:id', AuthMiddleware.authenticate, vehiclesController.deleteVariant);

export default router;
