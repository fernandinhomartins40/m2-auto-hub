import { useState, useEffect } from 'react';
import settingsService, { StoreSettings } from '@/api/settingsService';

/**
 * Hook global para acessar configurações públicas da loja
 * Usado por toda a aplicação para dados como WhatsApp, horários, etc.
 *
 * Features:
 * - Cache local (5 minutos)
 * - Auto-refresh periódico
 * - Fallback para valores padrão
 */

interface UseStoreSettingsResult {
  settings: Partial<StoreSettings> | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Cache global
let cachedSettings: Partial<StoreSettings> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useStoreSettings = (): UseStoreSettingsResult => {
  const [settings, setSettings] = useState<Partial<StoreSettings> | null>(cachedSettings);
  const [loading, setLoading] = useState<boolean>(!cachedSettings);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async (force = false) => {
    // Verificar cache
    const now = Date.now();
    if (!force && cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await settingsService.getPublicSettings();

      // Atualizar cache
      cachedSettings = data;
      cacheTimestamp = Date.now();

      setSettings(data);
    } catch (err: any) {
      console.error('Erro ao carregar configurações públicas:', err);
      setError(err.message || 'Erro ao carregar configurações');

      // Fallback para valores padrão se cache estiver vazio
      if (!cachedSettings) {
        cachedSettings = {
          storeName: 'Moria Peças & Serviços',
          whatsapp: '5511999999999',
          email: 'contato@moriapecas.com',
          phone: '',
          freeShippingMin: 150,
          deliveryFee: 15.90,
          deliveryDays: 3,
        };
        setSettings(cachedSettings);
      }
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchSettings(true);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    refresh,
  };
};

/**
 * Limpa o cache de configurações
 * Útil após atualização no painel admin
 */
export const clearSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = 0;
};
