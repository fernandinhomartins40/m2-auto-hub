// src/hooks/useFavoritesCache.ts
import { useState, useEffect, useCallback } from 'react';
import { favoriteService, productService, handleApiError } from '@/api';
import type { Favorite } from '@/api/favoriteService';
import type { Product } from '@/api/productService';

const CACHE_KEY = 'moria_favorites_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  favorites: Favorite[];
  products: Record<string, Product>;
  timestamp: number;
}

interface FavoriteProductData extends Product {
  favoriteId: string;
  addedAt: string;
}

export const useFavoritesCache = () => {
  const [cachedData, setCachedData] = useState<CachedData | null>(null);

  // Load from cache on mount
  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: CachedData = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid
        if (now - data.timestamp < CACHE_DURATION) {
          setCachedData(data);
          return data;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (err) {
      console.error('Error loading cache:', err);
      localStorage.removeItem(CACHE_KEY);
    }
    return null;
  };

  const saveToCache = (favorites: Favorite[], products: Record<string, Product>) => {
    try {
      const data: CachedData = {
        favorites,
        products,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setCachedData(data);
    } catch (err) {
      console.error('Error saving cache:', err);
    }
  };

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY);
    setCachedData(null);
  };

  const getCachedProduct = (productId: string): Product | null => {
    return cachedData?.products[productId] || null;
  };

  const getCachedFavorites = (): Favorite[] | null => {
    if (!cachedData) return null;

    const now = Date.now();
    if (now - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.favorites;
    }

    clearCache();
    return null;
  };

  return {
    cachedData,
    loadFromCache,
    saveToCache,
    clearCache,
    getCachedProduct,
    getCachedFavorites,
    isCacheValid: cachedData !== null
  };
};
