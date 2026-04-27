import { Router } from 'express';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';
import { loyaltyController } from './loyalty.controller.js';

const router = Router();

router.get('/settings', loyaltyController.getSettings);

router.use(AuthMiddleware.authenticate, AuthMiddleware.requireActive);
router.get('/stats', loyaltyController.getCustomerStats);
router.get('/transactions', loyaltyController.getCustomerTransactions);
router.get('/rewards', loyaltyController.getCustomerRewards);
router.post('/redeem', loyaltyController.redeemReward);
router.get('/redeemed', loyaltyController.getRedeemedRewards);

export default router;
