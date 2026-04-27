import { Router } from 'express';
import multer from 'multer';
import { AdminController } from './admin.controller.js';
import { RevisionsController } from '@modules/revisions/revisions.controller.js';
import { ProductsController } from '@modules/products/products.controller.js';
import { ServicesController } from '@modules/services/services.controller.js';
import { CouponsController } from '@modules/coupons/coupons.controller.js';
import { PromotionsController } from '@modules/promotions/promotions.controller.js';
import revisionAppointmentsController from '@modules/revision-appointments/revision-appointments.controller.js';
import { loyaltyController } from '@modules/loyalty/loyalty.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { AdminRole } from '@prisma/client';

const router = Router();
const adminController = new AdminController();
const revisionsController = new RevisionsController();
const productsController = new ProductsController();
const servicesController = new ServicesController();
const couponsController = new CouponsController();
const promotionsController = new PromotionsController();
const vehicleRecognitionUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Arquivo de imagem invalido'));
  },
});

// All routes require admin authentication
router.use(AdminAuthMiddleware.authenticate);
router.use(AdminAuthMiddleware.requireMinRole(AdminRole.STAFF));

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/relationship/insights', adminController.getCustomerRelationshipInsights);
router.get('/loyalty/stats', loyaltyController.getAdminStats);
router.get('/loyalty/settings', loyaltyController.getAdminSettings);
router.put('/loyalty/settings', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), loyaltyController.updateAdminSettings);
router.get('/loyalty/rewards', loyaltyController.getAdminRewards);
router.post('/loyalty/rewards', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), loyaltyController.createReward);
router.put('/loyalty/rewards/:rewardId', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), loyaltyController.updateReward);
router.delete('/loyalty/rewards/:rewardId', AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), loyaltyController.deleteReward);
router.get('/loyalty/customers', loyaltyController.getCustomersWithPoints);
router.get('/loyalty/customers/:customerId/stats', loyaltyController.getAdminCustomerStats);
router.get('/loyalty/customers/:customerId/transactions', loyaltyController.getAdminCustomerTransactions);
router.post('/loyalty/points/adjust', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), loyaltyController.adjustPoints);
router.get('/loyalty/redemptions', loyaltyController.getAdminRedemptions);
router.post('/loyalty/redemptions/:redemptionCode/use', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), loyaltyController.markRedemptionAsUsed);

// ==================== ORDERS ====================
router.get('/orders', adminController.getOrders);
router.post('/orders', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.createOrder);
router.post('/orders/export-pdf', adminController.exportOrdersPdf);
router.get('/orders/:id', adminController.getOrderById);
router.post('/orders/:id/export-pdf', adminController.exportOrderPdf);
router.patch('/orders/:id/status', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), adminController.updateOrderStatus);

// ==================== CUSTOMERS ====================
router.get('/vehicles/lookup', adminController.lookupVehicleByPlate);
router.post(
  '/vehicles/recognize',
  AdminAuthMiddleware.requireMinRole(AdminRole.STAFF),
  vehicleRecognitionUpload.single('image'),
  adminController.recognizeVehiclePlate
);
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerById);
router.post('/customers', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.createCustomer);
router.post('/customers/:customerId/addresses', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.createCustomerAddress);
router.get('/customers/:customerId/vehicles', adminController.getCustomerVehicles);
router.post('/customers/:customerId/vehicles', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.createVehicleForCustomer);
router.patch('/customers/:id/level', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), adminController.updateCustomerLevel);
router.patch('/customers/:id/status', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), adminController.updateCustomerStatus);

// ==================== QUOTES ====================
router.get('/quotes', adminController.getQuotes);
router.get('/quotes/:id', adminController.getQuoteById);
router.post('/quotes/:id/export-pdf', adminController.exportQuotePdf);
router.post('/quotes', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.createQuote);
router.patch('/quotes/:id/prices', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.updateQuotePrices);
router.patch('/quotes/:id/approve', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), adminController.approveQuote);
router.patch('/quotes/:id/reject', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), adminController.rejectQuote);
router.patch('/quotes/:id/status', AdminAuthMiddleware.requireMinRole(AdminRole.STAFF), adminController.updateQuoteStatus);

// ==================== REVISIONS ====================
router.get('/revisions/statistics', revisionsController.getStatistics);
router.get('/revisions/vehicle/:vehicleId/history', revisionsController.getVehicleHistory);
router.get('/revisions', revisionsController.getRevisions);
router.get('/revisions/:id', revisionsController.getRevisionById);
router.post('/revisions/:id/export-pdf', revisionsController.exportRevisionPdf);
router.post('/revisions', revisionsController.createRevision);
router.put('/revisions/:id', revisionsController.updateRevision);
router.patch('/revisions/:id/start', revisionsController.startRevision);
router.patch('/revisions/:id/complete', revisionsController.completeRevision);
router.patch('/revisions/:id/cancel', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), revisionsController.cancelRevision);
router.delete('/revisions/:id', AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), revisionsController.deleteRevision);

// ==================== REVISION APPOINTMENTS ====================
router.get('/revision-appointments', revisionAppointmentsController.getAdminAppointments);
router.get('/revision-appointments/:id', revisionAppointmentsController.getAdminAppointmentById);
router.put(
  '/revision-appointments/:id/schedule',
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  revisionAppointmentsController.scheduleAppointment
);
router.patch(
  '/revision-appointments/:id/start',
  AdminAuthMiddleware.requireMinRole(AdminRole.STAFF),
  revisionAppointmentsController.startAppointment
);
router.patch(
  '/revision-appointments/:id/cancel',
  AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER),
  revisionAppointmentsController.cancelAdminAppointment
);

// ==================== PRODUCTS ====================
router.get('/products/categories/list', productsController.getCategories);
router.get('/products/stock/low', productsController.getLowStockProducts);
router.get('/products', productsController.getProducts);
router.get('/products/:id', productsController.getProductById);
router.post('/products', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), productsController.createProduct);
router.put('/products/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), productsController.updateProduct);
router.delete('/products/:id', AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), productsController.deleteProduct);
router.patch('/products/:id/stock', productsController.updateStock);

// ==================== SERVICES ====================
router.get('/services/categories/list', servicesController.getCategories);
router.get('/services', servicesController.getServices);
router.get('/services/:id', servicesController.getServiceById);
router.post('/services', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.createService);
router.put('/services/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), servicesController.updateService);
router.delete('/services/:id', AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN), servicesController.deleteService);

// ==================== COUPONS ====================
router.get('/coupons', couponsController.getCoupons);
router.get('/coupons/:id', couponsController.getCouponById);
router.post('/coupons', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.createCoupon);
router.put('/coupons/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.updateCoupon);
router.delete('/coupons/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), couponsController.deleteCoupon);

// ==================== PROMOTIONS ====================
router.get('/promotions', promotionsController.getPromotions);
router.get('/promotions/:id', promotionsController.getPromotionById);
router.post('/promotions', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.createPromotion);
router.put('/promotions/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.updatePromotion);
router.delete('/promotions/:id', AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER), promotionsController.deletePromotion);

export default router;
