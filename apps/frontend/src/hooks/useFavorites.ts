// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { favoriteService, handleApiError } from '@/api';
import type { Favorite, FavoriteListResponse } from '@/api/favoriteService';

interface UseFavoritesResult {
  favorites: Favorite[];
  favoriteProductIds: string[];
  loading: boolean;
  error: string | null;
  totalCount: number;

  // Actions
  fetchFavorites: (params?: { page?: number; limit?: number }) => Promise<void>;
  fetchFavoriteProductIds: () => Promise<void>;
  addToFavorites: (productId: string) => Promise<boolean>;
  removeFromFavorites: (productId: string) => Promise<boolean>;
  removeFavoriteById: (favoriteId: string) => Promise<boolean>;
  isFavorite: (productId: string) => boolean;
  checkIsFavorite: (productId: string) => Promise<boolean>;
  toggleFavorite: (productId: string) => Promise<boolean>;
  clearError: () => void;
  clearFavorites: () => void;
}

export const useFavorites = (): UseFavoritesResult => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchFavorites = useCallback(async (params?: { page?: number; limit?: number }) => {
    setLoading(true);
    setError(null);

    try {
      const response: FavoriteListResponse = await favoriteService.getFavorites(params);
      setFavorites(response.favorites);
      setTotalCount(response.totalCount);

      // Also update favoriteProductIds array
      const productIds = response.favorites.map(fav => fav.productId);
      setFavoriteProductIds(productIds);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFavoriteProductIds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const productIds = await favoriteService.getFavoriteProductIds();
      setFavoriteProductIds(productIds);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToFavorites = useCallback(async (productId: string): Promise<boolean> => {
    // Optimistic update
    setFavoriteProductIds(prev => [...prev, productId]);
    setLoading(true);
    setError(null);

    try {
      const newFavorite = await favoriteService.addToFavorites(productId);
      setFavorites(prev => [...prev, newFavorite]);
      return true;
    } catch (err) {
      // Rollback optimistic update on error
      setFavoriteProductIds(prev => prev.filter(id => id !== productId));
      const apiError = handleApiError(err);
      setError(apiError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeFromFavorites = useCallback(async (productId: string): Promise<boolean> => {
    // Optimistic update
    const removedFavorite = favorites.find(fav => fav.productId === productId);
    setFavoriteProductIds(prev => prev.filter(id => id !== productId));
    setFavorites(prev => prev.filter(fav => fav.productId !== productId));
    setLoading(true);
    setError(null);

    try {
      await favoriteService.removeFromFavorites(productId);
      return true;
    } catch (err) {
      // Rollback optimistic update on error
      setFavoriteProductIds(prev => [...prev, productId]);
      if (removedFavorite) {
        setFavorites(prev => [...prev, removedFavorite]);
      }
      const apiError = handleApiError(err);
      setError(apiError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  const removeFavoriteById = useCallback(async (favoriteId: string): Promise<boolean> => {
    // Optimistic update
    const removedFavorite = favorites.find(fav => fav.id === favoriteId);
    setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
    if (removedFavorite) {
      setFavoriteProductIds(prev => prev.filter(id => id !== removedFavorite.productId));
    }
    setLoading(true);
    setError(null);

    try {
      await favoriteService.removeFavoriteById(favoriteId);
      return true;
    } catch (err) {
      // Rollback optimistic update on error
      if (removedFavorite) {
        setFavorites(prev => [...prev, removedFavorite]);
        setFavoriteProductIds(prev => [...prev, removedFavorite.productId]);
      }
      const apiError = handleApiError(err);
      setError(apiError.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [favorites]);

  const isFavorite = useCallback((productId: string): boolean => {
    return favoriteProductIds.includes(productId);
  }, [favoriteProductIds]);

  const checkIsFavorite = useCallback(async (productId: string): Promise<boolean> => {
    try {
      return await favoriteService.isFavorite(productId);
    } catch (err) {
      const apiError = handleApiError(err);
      setError(apiError.message);
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (productId: string): Promise<boolean> => {
    if (isFavorite(productId)) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId);
    }
  }, [isFavorite, removeFromFavorites, addToFavorites]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    setFavoriteProductIds([]);
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    favorites,
    favoriteProductIds,
    loading,
    error,
    totalCount,
    fetchFavorites,
    fetchFavoriteProductIds,
    addToFavorites,
    removeFromFavorites,
    removeFavoriteById,
    isFavorite,
    checkIsFavorite,
    toggleFavorite,
    clearError,
    clearFavorites,
  };
};