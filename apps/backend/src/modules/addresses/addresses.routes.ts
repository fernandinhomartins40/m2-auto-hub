import { Router } from 'express';
import { AddressesController } from './addresses.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const addressesController = new AddressesController();

// All address routes require authentication
router.use(AuthMiddleware.authenticate);

router.get('/', addressesController.getAddresses);
router.get('/:id', addressesController.getAddressById);
router.post('/', addressesController.createAddress);
router.put('/:id', addressesController.updateAddress);
router.delete('/:id', addressesController.deleteAddress);
router.patch('/:id/default', addressesController.setDefaultAddress);

export default router;
