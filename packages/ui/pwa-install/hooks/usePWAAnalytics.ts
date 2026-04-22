import { useEffect } from 'react';
import { pwaAnalytics, initPWAAnalytics } from '../utils/analytics';
import { useDeviceDetection } from './useDeviceDetection';

interface UsePWAAnalyticsProps {
  variant: 'admin' | 'customer';
  location?: string;
}

/**
 * Hook para tracking automático de eventos PWA
 */
export function usePWAAnalytics({ variant, location = 'unknown' }: UsePWAAnalyticsProps) {
  const { platform, isStandalone } = useDeviceDetection();

  useEffect(() => {
    // Inicializar analytics na montagem
    initPWAAnalytics();

    // Track app opened se estiver em modo standalone
    if (isStandalone) {
      pwaAnalytics.appOpened(platform, variant, isStandalone);
    }

    // Capturar métricas de performance
    if ('PerformanceObserver' in window) {
      try {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcp = entries.find((entry) => entry.name === 'first-contentful-paint');
          if (fcp) {
            pwaAnalytics.performanceMetrics(platform, variant, {
              fcp: fcp.startTime,
            });
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            pwaAnalytics.performanceMetrics(platform, variant, {
              lcp: lastEntry.startTime,
            });
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            pwaAnalytics.performanceMetrics(platform, variant, {
              fid: entry.processingStart - entry.startTime,
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift
        let clsScore = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value;
            }
          }
          pwaAnalytics.performanceMetrics(platform, variant, {
            cls: clsScore,
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.error('Error setting up performance observers:', error);
      }
    }

    // Cleanup
    return () => {
      // Observers são automaticamente desconectados ao desmontar
    };
  }, [platform, variant, isStandalone]);

  return {
    trackPromptShown: () => pwaAnalytics.promptShown(platform, variant, location),
    trackInstallClicked: () => pwaAnalytics.installButtonClicked(platform, variant, location),
    trackInstalled: (source: string, timeToInstall?: number) =>
      pwaAnalytics.installed(platform, variant, source, timeToInstall),
    trackDismissed: (dismissCount: number) =>
      pwaAnalytics.promptDismissed(platform, variant, location, dismissCount),
    trackOfflineFeature: (feature: string) =>
      pwaAnalytics.offlineFeatureUsed(platform, variant, feature),
  };
}
