import { Router } from 'express';
import { settingsController } from './settings.controller.js';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';

const router = Router();

/**
 * Rotas de Configurações do Sistema
 */

// Rota pública - não requer autenticação
router.get('/public', settingsController.getPublicSettings.bind(settingsController));

// Rotas protegidas - requerem autenticação de admin
router.get('/', AdminAuthMiddleware.authenticate, settingsController.getSettings.bind(settingsController));
router.put('/', AdminAuthMiddleware.authenticate, settingsController.updateSettings.bind(settingsController));
router.post('/reset', AdminAuthMiddleware.authenticate, settingsController.resetSettings.bind(settingsController));
router.post('/assets/upload', AdminAuthMiddleware.authenticate, upload.single('image'), settingsController.uploadPdfAsset.bind(settingsController));

// Testes de integração - requerem autenticação de admin
router.post('/test-whatsapp', AdminAuthMiddleware.authenticate, settingsController.testWhatsApp.bind(settingsController));
router.post('/test-correios', AdminAuthMiddleware.authenticate, settingsController.testCorreios.bind(settingsController));
router.post('/test-payment', AdminAuthMiddleware.authenticate, settingsController.testPayment.bind(settingsController));

export default router;
