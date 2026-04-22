// src/contexts/FavoritesContext.tsx
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from './AuthContext';
import type { Favorite } from '@/api/favoriteService';

interface FavoritesContextType {
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

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { isAuthenticated } = useAuth();
  const favoritesHook = useFavorites();

  // Load favorite product IDs when user logs in or clear when logs out
  useEffect(() => {
    if (isAuthenticated) {
      favoritesHook.fetchFavoriteProductIds();
    } else {
      favoritesHook.clearFavorites();
    }
  }, [isAuthenticated]);

  return (
    <FavoritesContext.Provider value={favoritesHook}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
