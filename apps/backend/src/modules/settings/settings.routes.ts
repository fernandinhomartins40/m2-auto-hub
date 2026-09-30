import { Router } from 'express';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { settingsController } from './settings.controller.js';
import { AdminRole } from '@prisma/client';

const router = Router();

router.get('/public', settingsController.getPublicSettings.bind(settingsController));
router.get('/pwa-manifest.webmanifest', settingsController.getPwaManifest.bind(settingsController));
router.get('/pwa-apple-touch-icon.png', settingsController.getAppleTouchIcon.bind(settingsController));

const manager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const admin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];

router.get('/', ...manager, settingsController.getSettings.bind(settingsController));
router.put('/', ...manager, settingsController.updateSettings.bind(settingsController));
router.post('/reset', ...admin, settingsController.resetSettings.bind(settingsController));
router.post(
  '/assets/upload',
  ...manager,
  upload.single('image'),
  settingsController.uploadPdfAsset.bind(settingsController)
);
router.post(
  '/pwa-assets/upload',
  ...manager,
  upload.single('image'),
  settingsController.uploadPwaAsset.bind(settingsController)
);

router.post('/test-whatsapp', ...manager, settingsController.testWhatsApp.bind(settingsController));
router.post('/test-correios', ...manager, settingsController.testCorreios.bind(settingsController));
router.post('/test-payment', ...manager, settingsController.testPayment.bind(settingsController));
router.post('/test-plate-lookup', ...manager, settingsController.testPlateLookup.bind(settingsController));

export default router;
