import { Router } from 'express';
import { FavoritesController } from './favorites.controller.js';
import { AuthMiddleware } from '@middlewares/auth.middleware.js';

const router = Router();
const favoritesController = new FavoritesController();

// All favorite routes require authentication
router.use(AuthMiddleware.authenticate);
router.use(AuthMiddleware.requireActive);

// Get operations
router.get('/stats', favoritesController.getFavoriteStats);
router.get('/count', favoritesController.getFavoriteCount);
router.get('/product-ids', favoritesController.getFavoriteProductIds);
router.get('/check/:productId', favoritesController.checkFavorite);
router.get('/', favoritesController.getFavorites);

// Mutation operations
router.post('/', favoritesController.addFavorite);
router.post('/toggle', favoritesController.toggleFavorite);
router.delete('/product/:productId', favoritesController.removeFavorite);
router.delete('/:favoriteId', favoritesController.removeFavoriteById);
router.delete('/', favoritesController.clearFavorites);

export default router;
