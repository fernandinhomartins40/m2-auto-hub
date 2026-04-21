import { Request, Response, NextFunction } from 'express';
import { FavoritesService } from './favorites.service.js';
import { z } from 'zod';

const addFavoriteSchema = z.object({
  productId: z.string().uuid(),
});

export class FavoritesController {
  private favoritesService: FavoritesService;

  constructor() {
    this.favoritesService = new FavoritesService();
  }

  /**
   * POST /favorites
   * Add product to favorites
   */
  addFavorite = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { productId } = addFavoriteSchema.parse(req.body);
      const favorite = await this.favoritesService.addFavorite(
        req.user.customerId,
        productId
      );

      res.status(201).json({
        success: true,
        data: favorite,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /favorites/product/:productId
   * Remove product from favorites by product ID
   */
  removeFavorite = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.favoritesService.removeFavorite(
        req.user.customerId,
        req.params.productId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /favorites/:favoriteId
   * Remove favorite by favorite ID
   */
  removeFavoriteById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.favoritesService.removeFavoriteById(
        req.user.customerId,
        req.params.favoriteId
      );

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /favorites
   * Get all favorites for customer
   */
  getFavorites = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const includeProduct = req.query.includeProduct !== 'false';

      const result = await this.favoritesService.getFavorites(
        req.user.customerId,
        page,
        limit,
        includeProduct
      );

      res.status(200).json({
        success: true,
        data: {
          favorites: result.data,
          pagination: result.meta
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /favorites/product-ids
   * Get favorite product IDs
   */
  getFavoriteProductIds = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const productIds = await this.favoritesService.getFavoriteProductIds(
        req.user.customerId
      );

      res.status(200).json({
        success: true,
        data: productIds,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /favorites/check/:productId
   * Check if product is favorited
   */
  checkFavorite = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const isFavorited = await this.favoritesService.isFavorited(
        req.user.customerId,
        req.params.productId
      );

      res.status(200).json({
        success: true,
        data: { isFavorited },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /favorites/toggle
   * Toggle favorite status
   */
  toggleFavorite = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const { productId } = addFavoriteSchema.parse(req.body);
      const result = await this.favoritesService.toggleFavorite(
        req.user.customerId,
        productId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /favorites
   * Clear all favorites
   */
  clearFavorites = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const count = await this.favoritesService.clearFavorites(req.user.customerId);

      res.status(200).json({
        success: true,
        data: { deletedCount: count },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /favorites/count
   * Get favorite count
   */
  getFavoriteCount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const count = await this.favoritesService.getFavoriteCount(req.user.customerId);

      res.status(200).json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /favorites/stats
   * Get favorite statistics
   */
  getFavoriteStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const stats = await this.favoritesService.getFavoriteStats(req.user.customerId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  };
}
