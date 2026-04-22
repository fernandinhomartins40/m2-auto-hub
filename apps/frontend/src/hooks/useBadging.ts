import { useEffect, useCallback } from 'react';

interface Navigator {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

/**
 * Hook para usar a Badging API
 * Mostra um badge no ícone do app instalado (PWA)
 *
 * Suportado em:
 * - Chrome/Edge 81+ (Windows, macOS, Android)
 * - Safari iOS 16.4+
 *
 * @example
 * const { setBadge, clearBadge, isSupported } = useBadging();
 *
 * // Mostrar 5 notificações não lidas
 * setBadge(5);
 *
 * // Mostrar apenas indicador (dot)
 * setBadge();
 *
 * // Limpar badge
 * clearBadge();
 */
export function useBadging() {
  // Verificar se Badging API está disponível
  const isSupported =
    typeof navigator !== 'undefined' &&
    'setAppBadge' in navigator &&
    'clearAppBadge' in navigator;

  const setBadge = useCallback(
    async (count?: number) => {
      if (!isSupported) {
        console.warn('Badging API not supported in this browser');
        return;
      }

      try {
        const nav = navigator as Navigator;
        if (count !== undefined && count > 0) {
          // Mostrar badge com número
          await nav.setAppBadge?.(count);
          console.log(`Badge set to ${count}`);
        } else {
          // Mostrar apenas indicador (dot) sem número
          await nav.setAppBadge?.();
          console.log('Badge indicator set');
        }
      } catch (error) {
        console.error('Error setting app badge:', error);
      }
    },
    [isSupported]
  );

  const clearBadge = useCallback(async () => {
    if (!isSupported) {
      return;
    }

    try {
      const nav = navigator as Navigator;
      await nav.clearAppBadge?.();
      console.log('Badge cleared');
    } catch (error) {
      console.error('Error clearing app badge:', error);
    }
  }, [isSupported]);

  // Limpar badge ao desmontar (opcional)
  useEffect(() => {
    return () => {
      // Descomente se quiser limpar o badge ao desmontar
      // clearBadge();
    };
  }, []);

  return {
    setBadge,
    clearBadge,
    isSupported,
  };
}

/**
 * Hook para badge automático baseado em contador
 * Atualiza o badge automaticamente quando o contador muda
 *
 * @example
 * const unreadOrders = 3;
 * useAutoBadge(unreadOrders);
 */
export function useAutoBadge(count: number) {
  const { setBadge, clearBadge, isSupported } = useBadging();

  useEffect(() => {
    if (!isSupported) return;

    if (count > 0) {
      setBadge(count);
    } else {
      clearBadge();
    }
  }, [count, setBadge, clearBadge, isSupported]);

  return { isSupported };
}
