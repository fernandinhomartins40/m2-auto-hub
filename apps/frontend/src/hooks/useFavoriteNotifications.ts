// src/hooks/useFavoriteNotifications.ts
import { useState, useEffect, useCallback } from 'react';
import { favoriteService, productService } from '@/api';
import { useToast } from './use-toast';
import type { Product } from '@/api/productService';

const NOTIFICATION_SETTINGS_KEY = 'moria_favorite_notifications';
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

interface NotificationSettings {
  priceDrops: boolean;
  backInStock: boolean;
  newPromotions: boolean;
}

interface ProductNotification {
  productId: string;
  type: 'price_drop' | 'back_in_stock' | 'promotion';
  oldValue?: number;
  newValue?: number;
  message: string;
}

interface TrackedProduct {
  productId: string;
  lastPrice: number;
  wasOutOfStock: boolean;
  lastChecked: number;
}

const TRACKED_PRODUCTS_KEY = 'moria_tracked_favorites';

export const useFavoriteNotifications = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    priceDrops: true,
    backInStock: true,
    newPromotions: true
  });
  const [trackedProducts, setTrackedProducts] = useState<Map<string, TrackedProduct>>(new Map());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadSettings();
    loadTrackedProducts();

    // Check for updates periodically
    const interval = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    // Check immediately on mount
    checkForUpdates();

    return () => clearInterval(interval);
  }, []);

  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
    }
  };

  const saveSettings = (newSettings: NotificationSettings) => {
    try {
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (err) {
      console.error('Error saving notification settings:', err);
    }
  };

  const loadTrackedProducts = () => {
    try {
      const stored = localStorage.getItem(TRACKED_PRODUCTS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setTrackedProducts(new Map(Object.entries(data)));
      }
    } catch (err) {
      console.error('Error loading tracked products:', err);
    }
  };

  const saveTrackedProducts = (products: Map<string, TrackedProduct>) => {
    try {
      const obj = Object.fromEntries(products);
      localStorage.setItem(TRACKED_PRODUCTS_KEY, JSON.stringify(obj));
      setTrackedProducts(products);
    } catch (err) {
      console.error('Error saving tracked products:', err);
    }
  };

  const trackProduct = useCallback(async (productId: string) => {
    try {
      const product = await productService.getProductById(productId);
      const tracked: TrackedProduct = {
        productId,
        lastPrice: product.promoPrice || product.salePrice,
        wasOutOfStock: !product.isActive || product.stock === 0,
        lastChecked: Date.now()
      };

      const newTracked = new Map(trackedProducts);
      newTracked.set(productId, tracked);
      saveTrackedProducts(newTracked);
    } catch (err) {
      console.error(`Error tracking product ${productId}:`, err);
    }
  }, [trackedProducts]);

  const checkForUpdates = async () => {
    if (isChecking || trackedProducts.size === 0) return;

    setIsChecking(true);

    try {
      const favorites = await favoriteService.getFavoriteProductIds();
      const notifications: ProductNotification[] = [];

      // Check each favorite product
      for (const productId of favorites) {
        const tracked = trackedProducts.get(productId);

        try {
          const product = await productService.getProductById(productId);
          const currentPrice = product.promoPrice || product.salePrice;
          const isInStock = product.isActive && product.stock > 0;

          if (tracked) {
            // Check for price drop
            if (settings.priceDrops && currentPrice < tracked.lastPrice) {
              const dropPercentage = Math.round(((tracked.lastPrice - currentPrice) / tracked.lastPrice) * 100);
              notifications.push({
                productId,
                type: 'price_drop',
                oldValue: tracked.lastPrice,
                newValue: currentPrice,
                message: `${product.name} está ${dropPercentage}% mais barato!`
              });
            }

            // Check if back in stock
            if (settings.backInStock && tracked.wasOutOfStock && isInStock) {
              notifications.push({
                productId,
                type: 'back_in_stock',
                message: `${product.name} voltou ao estoque!`
              });
            }

            // Check for new promotion
            if (settings.newPromotions && product.promoPrice && !tracked.wasOutOfStock && currentPrice < tracked.lastPrice) {
              notifications.push({
                productId,
                type: 'promotion',
                oldValue: tracked.lastPrice,
                newValue: currentPrice,
                message: `Nova promoção em ${product.name}!`
              });
            }

            // Update tracked data
            const newTracked = new Map(trackedProducts);
            newTracked.set(productId, {
              productId,
              lastPrice: currentPrice,
              wasOutOfStock: !isInStock,
              lastChecked: Date.now()
            });
            saveTrackedProducts(newTracked);
          } else {
            // Start tracking this product
            trackProduct(productId);
          }
        } catch (err) {
          console.error(`Error checking product ${productId}:`, err);
        }
      }

      // Show notifications
      notifications.forEach(notification => {
        showNotification(notification);
      });
    } catch (err) {
      console.error('Error checking for updates:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const showNotification = (notification: ProductNotification) => {
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(price);
    };

    let description = notification.message;
    if (notification.oldValue && notification.newValue) {
      description += ` De ${formatPrice(notification.oldValue)} por ${formatPrice(notification.newValue)}`;
    }

    toast({
      title: notification.type === 'price_drop' ? '💰 Preço Reduzido!' :
             notification.type === 'back_in_stock' ? '📦 Voltou ao Estoque!' :
             '🎉 Nova Promoção!',
      description,
      duration: 10000
    });

    // Try to show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Moria - Favorito Atualizado', {
        body: notification.message,
        icon: '/logo.png'
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    saveSettings({ ...settings, ...newSettings });
  };

  return {
    settings,
    updateSettings,
    checkForUpdates,
    trackProduct,
    requestNotificationPermission,
    isChecking,
    hasNotificationsEnabled: settings.priceDrops || settings.backInStock || settings.newPromotions
  };
};
