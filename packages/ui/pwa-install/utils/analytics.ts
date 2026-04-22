/**
 * Analytics helper for PWA installation tracking
 */

export interface PWAEvent {
  event: string;
  platform: 'android' | 'ios' | 'desktop' | 'unknown';
  variant: 'admin' | 'customer';
  timestamp: string;
  [key: string]: any;
}

/**
 * Track PWA-related events
 */
export function trackPWAEvent(
  event: string,
  properties: Partial<PWAEvent> = {}
): void {
  const eventData: PWAEvent = {
    event,
    platform: 'unknown',
    variant: 'customer',
    timestamp: new Date().toISOString(),
    ...properties,
  };

  // Google Analytics (gtag)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event, {
      ...eventData,
      event_category: 'PWA',
      event_label: `${properties.platform}_${properties.variant}`,
    });
  }

  // Facebook Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('trackCustom', event, eventData);
  }

  // Custom Analytics (pode ser substituído)
  if (typeof window !== 'undefined' && (window as any).customAnalytics) {
    (window as any).customAnalytics.track(event, eventData);
  }

  // Console log em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[PWA Analytics]', event, eventData);
  }

  // LocalStorage para tracking offline
  try {
    const offlineEvents = JSON.parse(
      localStorage.getItem('pwa_offline_events') || '[]'
    );
    offlineEvents.push(eventData);

    // Manter apenas os últimos 50 eventos
    if (offlineEvents.length > 50) {
      offlineEvents.shift();
    }

    localStorage.setItem('pwa_offline_events', JSON.stringify(offlineEvents));
  } catch (error) {
    console.error('Error storing offline analytics:', error);
  }
}

/**
 * Flush offline events to analytics when online
 */
export function flushOfflineEvents(): void {
  try {
    const offlineEvents = JSON.parse(
      localStorage.getItem('pwa_offline_events') || '[]'
    );

    if (offlineEvents.length > 0 && navigator.onLine) {
      offlineEvents.forEach((event: PWAEvent) => {
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', event.event, event);
        }
      });

      // Clear after successful flush
      localStorage.removeItem('pwa_offline_events');
      console.log(`[PWA Analytics] Flushed ${offlineEvents.length} offline events`);
    }
  } catch (error) {
    console.error('Error flushing offline events:', error);
  }
}

/**
 * Specific tracking functions for common PWA events
 */
export const pwaAnalytics = {
  // Quando o prompt de instalação é exibido
  promptShown: (platform: string, variant: string, location: string) => {
    trackPWAEvent('pwa_prompt_shown', {
      platform,
      variant,
      location,
    });
  },

  // Quando o usuário clica no botão de instalação
  installButtonClicked: (platform: string, variant: string, location: string) => {
    trackPWAEvent('pwa_install_button_clicked', {
      platform,
      variant,
      location,
    });
  },

  // Quando o PWA é instalado com sucesso
  installed: (platform: string, variant: string, source: string, timeToInstall?: number) => {
    trackPWAEvent('pwa_installed', {
      platform,
      variant,
      source,
      time_to_install_seconds: timeToInstall,
    });
  },

  // Quando o usuário dispensa o prompt
  promptDismissed: (platform: string, variant: string, location: string, dismissCount: number) => {
    trackPWAEvent('pwa_prompt_dismissed', {
      platform,
      variant,
      location,
      dismiss_count: dismissCount,
    });
  },

  // Quando o usuário abre o PWA instalado
  appOpened: (platform: string, variant: string, isStandalone: boolean) => {
    trackPWAEvent('pwa_app_opened', {
      platform,
      variant,
      is_standalone: isStandalone,
      session_start: new Date().toISOString(),
    });
  },

  // Quando o usuário interage com features offline
  offlineFeatureUsed: (platform: string, variant: string, feature: string) => {
    trackPWAEvent('pwa_offline_feature_used', {
      platform,
      variant,
      feature,
      is_online: navigator.onLine,
    });
  },

  // Quando o service worker é atualizado
  serviceWorkerUpdated: (platform: string, variant: string) => {
    trackPWAEvent('pwa_sw_updated', {
      platform,
      variant,
    });
  },

  // Métricas de performance
  performanceMetrics: (
    platform: string,
    variant: string,
    metrics: {
      fcp?: number; // First Contentful Paint
      lcp?: number; // Largest Contentful Paint
      fid?: number; // First Input Delay
      cls?: number; // Cumulative Layout Shift
      ttfb?: number; // Time to First Byte
    }
  ) => {
    trackPWAEvent('pwa_performance_metrics', {
      platform,
      variant,
      ...metrics,
    });
  },
};

/**
 * Hook de instalação de analytics
 * Chamar no início do app
 */
export function initPWAAnalytics(): void {
  // Flush offline events when coming online
  window.addEventListener('online', flushOfflineEvents);

  // Track app installation
  window.addEventListener('appinstalled', () => {
    const installStartTime = localStorage.getItem('pwa_install_start_time');
    const timeToInstall = installStartTime
      ? (Date.now() - parseInt(installStartTime, 10)) / 1000
      : undefined;

    localStorage.removeItem('pwa_install_start_time');
  });

  // Flush on page load if online
  if (navigator.onLine) {
    setTimeout(flushOfflineEvents, 2000);
  }

  console.log('[PWA Analytics] Initialized');
}
