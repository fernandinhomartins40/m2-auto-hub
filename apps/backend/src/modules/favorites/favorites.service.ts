import { Favorite, Product, Prisma } from '@prisma/client';
import { prisma } from '@config/database.js';
import { ApiError } from '@shared/utils/error.util.js';
import { PaginationUtil, PaginatedResponse } from '@shared/utils/pagination.util.js';
import { logger } from '@shared/utils/logger.util.js';

export type FavoriteWithProduct = Favorite & {
  product?: Product;
};

export class FavoritesService {
  /**
   * Add product to favorites
   */
  async addFavorite(customerId: string, productId: string): Promise<Favorite> {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw ApiError.notFound('Product not found');
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict('Product already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: {
        customerId,
        productId,
      },
    });

    logger.info(`Product ${productId} added to favorites for customer ${customerId}`);

    return favorite;
  }

  /**
   * Remove product from favorites by product ID
   */
  async removeFavorite(customerId: string, productId: string): Promise<void> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    if (!favorite) {
      throw ApiError.notFound('Favorite not found');
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    logger.info(`Product ${productId} removed from favorites for customer ${customerId}`);
  }

  /**
   * Remove favorite by favorite ID
   */
  async removeFavoriteById(customerId: string, favoriteId: string): Promise<void> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        id: favoriteId,
      },
    });

    if (!favorite) {
      throw ApiError.notFound('Favorite not found');
    }

    // Verify ownership
    if (favorite.customerId !== customerId) {
      throw ApiError.forbidden('You do not have permission to delete this favorite');
    }

    await prisma.favorite.delete({
      where: {
        id: favoriteId,
      },
    });

    logger.info(`Favorite ${favoriteId} removed for customer ${customerId}`);
  }

  /**
   * Get all favorites for customer with pagination
   */
  async getFavorites(
    customerId: string,
    page: number = 1,
    limit: number = 20,
    includeProduct: boolean = true
  ): Promise<PaginatedResponse<Favorite>> {
    const { page: validPage, limit: validLimit } = PaginationUtil.validateParams({
      page,
      limit,
    });
    const skip = PaginationUtil.calculateSkip(validPage, validLimit);

    const where: Prisma.FavoriteWhereInput = {
      customerId,
    };

    const [favorites, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: validLimit,
      }),
      prisma.favorite.count({ where }),
    ]);

    // Fetch products separately if needed
    let favoritesWithProducts = favorites;
    if (includeProduct) {
      const productIds = favorites.map((f) => f.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      favoritesWithProducts = favorites.map((favorite) => ({
        ...favorite,
        product: products.find((p) => p.id === favorite.productId),
      })) as any;
    }

    return PaginationUtil.buildResponse(
      favoritesWithProducts,
      validPage,
      validLimit,
      totalCount
    );
  }

  /**
   * Get favorite product IDs for customer
   */
  async getFavoriteProductIds(customerId: string): Promise<string[]> {
    const favorites = await prisma.favorite.findMany({
      where: { customerId },
      select: { productId: true },
    });

    return favorites.map((f) => f.productId);
  }

  /**
   * Check if product is favorited by customer
   */
  async isFavorited(customerId: string, productId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    return !!favorite;
  }

  /**
   * Toggle favorite (add if not exists, remove if exists)
   */
  async toggleFavorite(customerId: string, productId: string): Promise<{
    action: 'added' | 'removed';
    favorite?: Favorite;
  }> {
    const existing = await prisma.favorite.findUnique({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
    });

    if (existing) {
      await this.removeFavorite(customerId, productId);
      return { action: 'removed' };
    } else {
      const favorite = await this.addFavorite(customerId, productId);
      return { action: 'added', favorite };
    }
  }

  /**
   * Clear all favorites for customer
   */
  async clearFavorites(customerId: string): Promise<number> {
    const result = await prisma.favorite.deleteMany({
      where: { customerId },
    });

    logger.info(`Cleared ${result.count} favorites for customer ${customerId}`);

    return result.count;
  }

  /**
   * Get favorite count for customer
   */
  async getFavoriteCount(customerId: string): Promise<number> {
    return prisma.favorite.count({
      where: { customerId },
    });
  }

  /**
   * Get favorite statistics
   */
  async getFavoriteStats(customerId: string): Promise<{
    totalFavorites: number;
    favoritesByCategory: Record<string, number>;
    recentlyAdded: Favorite[];
  }> {
    const favorites = await prisma.favorite.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });

    const productIds = favorites.map((f) => f.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true },
    });

    const favoritesByCategory = products.reduce(
      (acc, product) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const recentlyAdded = favorites.slice(0, 5);

    return {
      totalFavorites: favorites.length,
      favoritesByCategory,
      recentlyAdded,
    };
  }
}
