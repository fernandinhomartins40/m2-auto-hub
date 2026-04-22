import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getDefaultConfig } from '@/utils/landingPageDefaults';
import { migrateColorArray } from '@/utils/colorHelpers';
import { LandingPageConfig } from '@/types/landingPage';

const STORAGE_KEY = 'moria_landing_page_config';
const AUTO_SAVE_DELAY = 5 * 60 * 1000;
const ENABLE_AUTO_SAVE = true;
const ENABLE_LOGGING = import.meta.env.DEV;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');

const log = (message: string, data?: unknown) => {
  if (!ENABLE_LOGGING) {
    return;
  }

  console.log(`[LandingPageConfig] ${new Date().toISOString()} - ${message}`, data || '');
};

const deepMerge = (target: any, source: any): any => {
  if (!source) {
    return target;
  }

  if (!target) {
    return source;
  }

  const output = { ...target };

  for (const key in source) {
    if (source[key] === null || source[key] === undefined) {
      output[key] = target[key];
      continue;
    }

    if (Array.isArray(source[key])) {
      output[key] = [...source[key]];
      continue;
    }

    if (typeof source[key] === 'object') {
      output[key] = deepMerge(target[key] || {}, source[key]);
      continue;
    }

    output[key] = source[key];
  }

  for (const key in target) {
    if (!(key in output)) {
      output[key] = target[key];
    }
  }

  return output;
};

const migrateConfigColors = (config: LandingPageConfig): LandingPageConfig => {
  const migratedConfig = { ...config };

  if (migratedConfig.contactPage?.contactInfoCards) {
    migratedConfig.contactPage.contactInfoCards = migrateColorArray(
      migratedConfig.contactPage.contactInfoCards
    );
  }

  if (migratedConfig.aboutPage?.values) {
    migratedConfig.aboutPage.values = migrateColorArray(migratedConfig.aboutPage.values);
  }

  return migratedConfig;
};

const normalizeConfig = (
  rawConfig?: Partial<LandingPageConfig> & { updatedAt?: string }
): LandingPageConfig => {
  const defaults = getDefaultConfig();
  const source = rawConfig || {};

  return migrateConfigColors({
    version: source.version || defaults.version,
    lastModified: source.updatedAt || source.lastModified || defaults.lastModified,
    header: deepMerge(defaults.header, source.header),
    hero: deepMerge(defaults.hero, source.hero),
    marquee: deepMerge(defaults.marquee, source.marquee),
    about: deepMerge(defaults.about, source.about),
    products: deepMerge(defaults.products, source.products),
    services: deepMerge(defaults.services, source.services),
    contactPage: deepMerge(defaults.contactPage, source.contactPage),
    aboutPage: deepMerge(defaults.aboutPage, source.aboutPage),
    contact: deepMerge(defaults.contact, source.contact),
    footer: deepMerge(defaults.footer, source.footer),
  });
};

const getPersistedSections = (config: LandingPageConfig) => ({
  header: config.header,
  hero: config.hero,
  marquee: config.marquee,
  about: config.about,
  products: config.products,
  services: config.services,
  contactPage: config.contactPage,
  aboutPage: config.aboutPage,
  contact: config.contact,
  footer: config.footer,
});

export interface UseLandingPageConfigResult {
  config: LandingPageConfig;
  loading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  error: string | null;
  updateConfig: (section: keyof LandingPageConfig, data: any) => void;
  save: (isAutoSave?: boolean) => Promise<void>;
  reset: () => void;
  loadFromBackend: () => Promise<void>;
  exportConfig: () => void;
  importConfig: (configJson: string) => void;
}

export const useLandingPageConfig = (): UseLandingPageConfigResult => {
  const [config, setConfig] = useState<LandingPageConfig>(getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLoadedInitially = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFromBackend = useCallback(async () => {
    try {
      log('Loading landing page config from backend');
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/landing-page/config`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const { success, data } = await response.json();

      if (!success || !data) {
        throw new Error('Resposta invalida do backend');
      }

      const normalizedConfig = normalizeConfig(data);

      setConfig(normalizedConfig);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedConfig));

      log('Landing page config loaded from backend', {
        hasHeader: Boolean(normalizedConfig.header),
        hasHero: Boolean(normalizedConfig.hero),
        hasFooter: Boolean(normalizedConfig.footer),
      });
    } catch (err: any) {
      log('Failed to load landing page config from backend', { error: err.message });
      setError(err.message);

      try {
        const cached = localStorage.getItem(STORAGE_KEY);

        if (cached) {
          const cachedConfig = normalizeConfig(JSON.parse(cached));
          log('Using landing page config from localStorage');
          setConfig(cachedConfig);
        } else {
          log('Using default landing page config');
          setConfig(getDefaultConfig());
        }
      } catch {
        log('Failed to read landing page config from localStorage, using defaults');
        setConfig(getDefaultConfig());
      }
    } finally {
      setLoading(false);
      hasLoadedInitially.current = true;
    }
  }, []);

  const save = useCallback(
    async (isAutoSave = false) => {
      try {
        log(isAutoSave ? 'Auto-saving landing page config' : 'Saving landing page config');
        setIsSaving(true);
        setError(null);

        const saveResponse = await fetch(`${API_BASE_URL}/landing-page/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(getPersistedSections(config)),
        });

        if (!saveResponse.ok) {
          throw new Error(`Erro ao salvar: ${saveResponse.statusText}`);
        }

        const { success, data } = await saveResponse.json();

        if (!success || !data) {
          throw new Error('Falha ao salvar configuracao');
        }

        const persistedConfig = normalizeConfig(data);

        setConfig(persistedConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedConfig));

        try {
          await fetch(`${API_BASE_URL}/landing-page/config/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              config: getPersistedSections(persistedConfig),
              changeType: isAutoSave ? 'auto_save' : 'manual_save',
            }),
          });
        } catch (historyError) {
          log('Failed to save landing page config history', historyError);
        }

        setIsDirty(false);

        if (!isAutoSave) {
          toast.success('Configuracao salva com sucesso!');
        }
      } catch (err: any) {
        log('Failed to save landing page config', { error: err.message });
        setError(err.message);

        if (!isAutoSave) {
          toast.error(`Erro ao salvar: ${err.message}`);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [config]
  );

  const updateConfig = useCallback((section: keyof LandingPageConfig, data: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: data,
      lastModified: new Date().toISOString(),
    }));

    setIsDirty(true);
  }, []);

  const reset = useCallback(() => {
    if (
      !confirm(
        'Tem certeza que deseja restaurar as configuracoes padrao? Todas as alteracoes nao salvas serao perdidas.'
      )
    ) {
      return;
    }

    setConfig(getDefaultConfig());
    setIsDirty(true);
    toast.info('Configuracoes restauradas para o padrao');
  }, []);

  const exportConfig = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `moria-landing-page-config-${new Date().toISOString().split('T')[0]}.json`;
    anchor.click();

    URL.revokeObjectURL(url);
    toast.success('Configuracao exportada com sucesso!');
  }, [config]);

  const importConfig = useCallback((configJson: string) => {
    try {
      const imported = JSON.parse(configJson);
      const normalizedConfig = normalizeConfig(imported);

      setConfig(normalizedConfig);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedConfig));
      setIsDirty(true);
      setError(null);

      toast.success('Configuracao importada com sucesso!');
    } catch {
      toast.error('Erro ao importar: JSON invalido');
    }
  }, []);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  useEffect(() => {
    if (!hasLoadedInitially.current || !isDirty || !ENABLE_AUTO_SAVE) {
      return;
    }

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      save(true);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [isDirty, save]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        save(false);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        exportConfig();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'r' && isDirty) {
        event.preventDefault();

        if (confirm('Voce tem alteracoes nao salvas. Deseja recarregar mesmo assim?')) {
          window.location.reload();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exportConfig, isDirty, save]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return {
    config,
    loading,
    isDirty,
    isSaving,
    error,
    updateConfig,
    save,
    reset,
    loadFromBackend,
    exportConfig,
    importConfig,
  };
};
