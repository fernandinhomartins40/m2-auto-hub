import { Router } from 'express';
import { CompatibilityController } from './compatibility.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const compatibilityController = new CompatibilityController();

// Public routes
router.get('/products/search', compatibilityController.findCompatibleProducts);
router.get('/vehicles/:productId', compatibilityController.getCompatibleVehicles);
router.get('/:id', compatibilityController.getCompatibilityById);
router.get('/', compatibilityController.getCompatibilities);

// Protected routes (admin only)
router.post('/', AuthMiddleware.authenticate, compatibilityController.createCompatibility);
router.put('/:id', AuthMiddleware.authenticate, compatibilityController.updateCompatibility);
router.delete('/:id', AuthMiddleware.authenticate, compatibilityController.deleteCompatibility);
router.patch('/:id/verify', AuthMiddleware.authenticate, compatibilityController.verifyCompatibility);

export default router;
