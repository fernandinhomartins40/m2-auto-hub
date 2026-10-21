import { Router } from 'express';
import { ApiError } from '@shared/utils/error.util.js';
import { ellonStoreService } from '../ellon/ellon-store.service.js';
import { CustomerController } from './customer.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const customerController = new CustomerController();

// Public quote approval routes
router.get('/public/quotes/:token', customerController.getPublicQuoteByToken);
router.patch('/public/quotes/:token/approve', customerController.approvePublicQuote);
router.patch('/public/quotes/:token/reject', customerController.rejectPublicQuote);

// All routes require customer authentication
router.use(AuthMiddleware.authenticate);

// ==================== COMPRAS (SITE + LOJA, VIA ELLON) ====================
router.get('/me/store-purchases', async (req, res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized('Cliente não autenticado.');
    const history = await ellonStoreService.customerHistory(req.user.customerId);
    res.json({ success: true, data: history.purchases, linked: history.linked });
  } catch (error) {
    next(error);
  }
});

// ==================== QUOTES ====================
router.post('/me/quotes', customerController.createMyQuote);
router.get('/me/quotes', customerController.getMyQuotes);
router.post('/me/quotes/:id/export-pdf', customerController.exportMyQuotePdf);
router.get('/me/quotes/:id', customerController.getMyQuoteById);
router.patch('/me/quotes/:id/approve', customerController.approveMyQuote);
router.patch('/me/quotes/:id/reject', customerController.rejectMyQuote);

// ==================== ORDERS ====================
router.get('/me/orders', customerController.getMyOrders);
router.get('/me/orders/:id', customerController.getMyOrderById);

export default router;
