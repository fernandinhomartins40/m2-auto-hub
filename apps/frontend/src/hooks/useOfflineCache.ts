import { useState, useEffect } from 'react';

interface CacheConfig {
  key: string;
  ttl?: number; // Time to live in milliseconds
}

interface CacheData<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook para gerenciar cache offline com sincronização
 * Armazena dados em localStorage para acesso offline
 */
export function useOfflineCache<T>(config: CacheConfig) {
  const { key, ttl = 1000 * 60 * 60 * 24 } = config; // Default: 24 horas
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carregar dados do cache ao montar
  useEffect(() => {
    loadFromCache();
  }, [key]);

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp }: CacheData<T> = JSON.parse(cached);
        const now = Date.now();

        // Verificar se o cache ainda é válido
        if (now - timestamp < ttl) {
          setCachedData(data);
          setLastSync(new Date(timestamp));
          return data;
        } else {
          // Cache expirado, remover
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return null;
  };

  const saveToCache = (data: T) => {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
      setCachedData(data);
      setLastSync(new Date());
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(key);
      setCachedData(null);
      setLastSync(null);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const isCacheValid = (): boolean => {
    if (!lastSync) return false;
    const now = Date.now();
    return now - lastSync.getTime() < ttl;
  };

  return {
    cachedData,
    isOnline,
    lastSync,
    saveToCache,
    loadFromCache,
    clearCache,
    isCacheValid,
  };
}
