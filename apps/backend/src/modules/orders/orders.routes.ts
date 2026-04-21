import { Router } from 'express';
import { OrdersController } from './orders.controller.js';
import { GuestOrdersController } from './guest-orders.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const ordersController = new OrdersController();
const guestOrdersController = new GuestOrdersController();

// ⚠️ PUBLIC ROUTE - Guest order creation (must be BEFORE authentication middleware)
router.post('/guest', guestOrdersController.createGuestOrder);

// All authenticated order routes require authentication
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireActive);

// Order statistics
router.get('/stats', ordersController.getOrderStats);

// CRUD operations
router.post('/', ordersController.createOrder);
router.get('/', ordersController.getOrders);
router.get('/:id', ordersController.getOrderById);
router.patch('/:id', ordersController.updateOrder);

// Cancel order
router.post('/:id/cancel', ordersController.cancelOrder);

export default router;
