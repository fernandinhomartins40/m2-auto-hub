import { Router } from 'express';
import { ProductsController } from './products.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const productsController = new ProductsController();

// Public routes
router.get('/', productsController.getProducts);
router.get('/categories/list', productsController.getCategories);
router.get('/offers/active', productsController.getActiveOffers);
router.get('/slug/:slug', productsController.getProductBySlug);
router.get('/sku/:sku', productsController.getProductBySku);
router.get('/category/:category', productsController.getProductsByCategory);
router.post('/bulk', productsController.getProductsByIds); // Bulk fetch products by IDs

// Protected routes (admin only)
router.get(
  '/categories',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.STAFF),
  productsController.getManagedCategories
);

router.post(
  '/categories',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  productsController.createCategory
);

router.patch(
  '/categories/:id',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  productsController.updateCategory
);

router.post(
  '/',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  upload.array('images', 10),
  productsController.createProduct
);

router.put(
  '/:id',
  AdminAuthMiddleware.authenticate,
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  upload.array('images', 10),
  productsController.updateProduct
);

router.delete('/:id', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), productsController.deleteProduct);
router.patch('/:id/stock', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), productsController.updateStock);
router.get('/stock/low', AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), productsController.getLowStockProducts);
router.get('/:id', productsController.getProductById);

export default router;
