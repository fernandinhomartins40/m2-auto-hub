// src/hooks/useFavoritesSync.ts
import { useState, useEffect, useCallback } from 'react';
import { favoriteService } from '@/api';

const OFFLINE_QUEUE_KEY = 'moria_favorites_offline_queue';

interface OfflineAction {
  id: string;
  type: 'add' | 'remove';
  productId: string;
  timestamp: number;
}

export const useFavoritesSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Load pending actions from localStorage
    loadPendingActions();

    // Setup online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        const actions = JSON.parse(stored) as OfflineAction[];
        setPendingActions(actions);
      }
    } catch (err) {
      console.error('Error loading pending actions:', err);
    }
  };

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(actions));
      setPendingActions(actions);
    } catch (err) {
      console.error('Error saving pending actions:', err);
    }
  };

  const addToOfflineQueue = (type: 'add' | 'remove', productId: string) => {
    const action: OfflineAction = {
      id: `${type}-${productId}-${Date.now()}`,
      type,
      productId,
      timestamp: Date.now()
    };

    const newActions = [...pendingActions, action];
    savePendingActions(newActions);
  };

  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0 || isSyncing) {
      return;
    }

    setIsSyncing(true);

    try {
      // Group actions by product to optimize
      const actionsByProduct = new Map<string, OfflineAction>();

      // Keep only the latest action for each product
      for (const action of pendingActions) {
        const existing = actionsByProduct.get(action.productId);
        if (!existing || action.timestamp > existing.timestamp) {
          actionsByProduct.set(action.productId, action);
        }
      }

      // Execute actions
      const promises = Array.from(actionsByProduct.values()).map(async (action) => {
        try {
          if (action.type === 'add') {
            await favoriteService.addToFavorites(action.productId);
          } else {
            await favoriteService.removeFromFavorites(action.productId);
          }
          return { success: true, action };
        } catch (err) {
          console.error(`Error syncing action ${action.id}:`, err);
          return { success: false, action };
        }
      });

      const results = await Promise.allSettled(promises);

      // Remove successful actions from queue
      const failedActions = results
        .filter((r) => r.status === 'fulfilled' && !r.value.success)
        .map((r) => (r as PromiseFulfilledResult<{ success: boolean; action: OfflineAction }>).value.action);

      savePendingActions(failedActions);

      console.log(`Synced ${actionsByProduct.size - failedActions.length} favorites`);
    } catch (err) {
      console.error('Error syncing favorites:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const clearPendingActions = () => {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    setPendingActions([]);
  };

  return {
    isOnline,
    pendingActions,
    isSyncing,
    addToOfflineQueue,
    syncPendingActions,
    clearPendingActions,
    hasPendingActions: pendingActions.length > 0
  };
};
