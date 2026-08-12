import { Router } from 'express';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { settingsController } from './settings.controller.js';

const router = Router();

router.get('/public', settingsController.getPublicSettings.bind(settingsController));
router.get('/pwa-manifest.webmanifest', settingsController.getPwaManifest.bind(settingsController));
router.get('/pwa-apple-touch-icon.png', settingsController.getAppleTouchIcon.bind(settingsController));

router.get('/', AdminAuthMiddleware.authenticate, settingsController.getSettings.bind(settingsController));
router.put('/', AdminAuthMiddleware.authenticate, settingsController.updateSettings.bind(settingsController));
router.post('/reset', AdminAuthMiddleware.authenticate, settingsController.resetSettings.bind(settingsController));
router.post(
  '/assets/upload',
  AdminAuthMiddleware.authenticate,
  upload.single('image'),
  settingsController.uploadPdfAsset.bind(settingsController)
);
router.post(
  '/pwa-assets/upload',
  AdminAuthMiddleware.authenticate,
  upload.single('image'),
  settingsController.uploadPwaAsset.bind(settingsController)
);

router.post('/test-whatsapp', AdminAuthMiddleware.authenticate, settingsController.testWhatsApp.bind(settingsController));
router.post('/test-correios', AdminAuthMiddleware.authenticate, settingsController.testCorreios.bind(settingsController));
router.post('/test-payment', AdminAuthMiddleware.authenticate, settingsController.testPayment.bind(settingsController));
router.post('/test-plate-lookup', AdminAuthMiddleware.authenticate, settingsController.testPlateLookup.bind(settingsController));

export default router;
