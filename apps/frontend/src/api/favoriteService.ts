// src/api/favoriteService.ts
import apiClient from './apiClient';

export interface Favorite {
  id: string;
  customerId: string;
  productId: string;
  createdAt: string;
}

export interface FavoriteListResponse {
  favorites: Favorite[];
  totalCount: number;
  page: number;
  limit: number;
}

interface StandardResponse<T> {
  success: boolean;
  data: T;
}

class FavoriteService {
  async getFavorites(params?: {
    page?: number;
    limit?: number;
  }): Promise<FavoriteListResponse> {
    const response = await apiClient.get<StandardResponse<{
      favorites: Favorite[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
      };
    }>>('/favorites', { params });

    // Convert to legacy format for compatibility
    return {
      favorites: response.data.data.favorites,
      totalCount: response.data.data.pagination.totalCount,
      page: response.data.data.pagination.page,
      limit: response.data.data.pagination.limit
    };
  }

  async getFavoriteProductIds(): Promise<string[]> {
    const response = await apiClient.get<StandardResponse<string[]>>('/favorites/product-ids');
    return response.data.data;
  }

  async addToFavorites(productId: string): Promise<Favorite> {
    const response = await apiClient.post<StandardResponse<Favorite>>('/favorites', { productId });
    return response.data.data;
  }

  async removeFromFavorites(productId: string): Promise<void> {
    await apiClient.delete(`/favorites/product/${productId}`);
  }

  async removeFavoriteById(favoriteId: string): Promise<void> {
    await apiClient.delete(`/favorites/${favoriteId}`);
  }

  async isFavorite(productId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<StandardResponse<{ isFavorited: boolean }>>(`/favorites/check/${productId}`);
      return response.data.data.isFavorited;
    } catch (error) {
      return false;
    }
  }

  async getFavoriteById(id: string): Promise<Favorite> {
    const response = await apiClient.get<StandardResponse<Favorite>>(`/favorites/${id}`);
    return response.data.data;
  }

  async getFavoriteCount(): Promise<number> {
    const response = await apiClient.get<StandardResponse<{ count: number }>>('/favorites/count');
    return response.data.data.count;
  }

  async getFavoriteStats(): Promise<any> {
    const response = await apiClient.get<StandardResponse<any>>('/favorites/stats');
    return response.data.data;
  }

  async clearAllFavorites(): Promise<void> {
    await apiClient.delete('/favorites');
  }
}

export default new FavoriteService();