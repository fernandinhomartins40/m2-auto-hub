import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { AdminAuthMiddleware } from '@middlewares/admin-auth.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { marketplaceController } from './marketplace.controller.js';
import { mlPanelController } from './ml-panel.controller.js';
import { webhookController } from './webhook.controller.js';

// ---------------------------------------------------------------------------
// Rotas administrativas: /marketplace/*
// ---------------------------------------------------------------------------
const router = Router();

const authStaff = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.STAFF)];
const authManager = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.MANAGER)];
const authAdmin = [AdminAuthMiddleware.authenticate, AdminAuthMiddleware.requireMinRole(AdminRole.ADMIN)];

// Conexao / onboarding (ADMIN)
router.get('/connections', ...authStaff, marketplaceController.getConnections);
router.get('/:provider/guide', ...authStaff, marketplaceController.getGuide);
router.get('/:provider/readiness', ...authStaff, marketplaceController.getReadiness);
router.post('/:provider/credentials', ...authAdmin, marketplaceController.setCredentials);
router.get('/:provider/authorize', ...authAdmin, marketplaceController.authorize);
router.post('/:provider/test', ...authAdmin, marketplaceController.testConnection);
router.post('/:provider/disconnect', ...authAdmin, marketplaceController.disconnect);

// Callback OAuth (PUBLICO — o marketplace redireciona o navegador para ca)
router.get('/:provider/callback', marketplaceController.callback);

// Catalogo / assistente de categoria (MANAGER+)
router.get('/:provider/categories/suggest', ...authManager, marketplaceController.suggestCategories);
router.get('/:provider/categories/:categoryId/attributes', ...authManager, marketplaceController.getCategoryAttributes);

// Listings / publicacao (MANAGER+)
router.get('/listings', ...authManager, marketplaceController.getListings);
router.get('/products/:productId/listings', ...authManager, marketplaceController.getProductListings);
router.post('/listings/:productId/publish', ...authManager, marketplaceController.publish);
router.post('/listings/:id/sync', ...authManager, marketplaceController.syncListing);
router.post('/listings/:id/pause', ...authManager, marketplaceController.pauseListing);
router.post('/listings/:id/activate', ...authManager, mlPanelController.activateListing);
router.delete('/listings/:id', ...authManager, marketplaceController.closeListing);

// Painel do Mercado Livre (MANAGER+): aptos, edicao rapida, aprovacao e regras
router.get('/ml-panel/settings', ...authManager, mlPanelController.getSettings);
router.put('/ml-panel/settings', ...authManager, mlPanelController.updateSettings);
router.get('/ml-panel/products', ...authManager, mlPanelController.list);
router.post('/ml-panel/products/approve', ...authManager, mlPanelController.approveMany);
router.get('/ml-panel/products/:productId', ...authManager, mlPanelController.detail);
router.put('/ml-panel/products/:productId', ...authManager, mlPanelController.updateProfile);
router.get('/ml-panel/products/:productId/categories', ...authManager, mlPanelController.suggestCategories);
router.post('/ml-panel/products/:productId/images', ...authManager, upload.array('images', 12), mlPanelController.addImages);
router.put('/ml-panel/products/:productId/images', ...authManager, mlPanelController.setImages);
router.post('/ml-panel/products/:productId/approve', ...authManager, mlPanelController.approve);

export default router;

// ---------------------------------------------------------------------------
// Rotas de webhook: /webhooks/* (publicas, validadas por assinatura)
// ---------------------------------------------------------------------------
export const webhookRouter = Router();
webhookRouter.post('/mercadolivre', webhookController.mercadoLivre);
webhookRouter.post('/shopee', webhookController.shopee);
