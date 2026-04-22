import { useEffect, useState } from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { useInstallPrompt } from './useInstallPrompt';
import { useDevMode } from './useDevMode';

const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000;

export type PwaVariant = 'customer' | 'admin';

function getStorageKey(variant: PwaVariant): string {
  return `pwa-install-dismissed-${variant}`;
}

function shouldForceShowBanner(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  return params.get('pwa-install') === '1' || params.get('show-pwa-banner') === '1';
}

export function usePWAInstall(variant: PwaVariant) {
  const deviceInfo = useDeviceDetection();
  const { isInstallable, promptInstall } = useInstallPrompt();
  const { isDevMode } = useDevMode();
  const [isDismissed, setIsDismissed] = useState(false);
  const storageKey = getStorageKey(variant);
  const forceShowBanner = shouldForceShowBanner();

  useEffect(() => {
    if (isDevMode || forceShowBanner) {
      localStorage.removeItem(storageKey);
      setIsDismissed(false);
      return;
    }

    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      return;
    }

    const dismissedTime = parseInt(dismissed, 10);
    const now = Date.now();

    if (now - dismissedTime < DISMISS_DURATION) {
      setIsDismissed(true);
      return;
    }

    localStorage.removeItem(storageKey);
  }, [forceShowBanner, isDevMode, storageKey]);

  useEffect(() => {
    if (!isInstallable) {
      return;
    }

    localStorage.removeItem(storageKey);
    setIsDismissed(false);
  }, [isInstallable, storageKey]);

  const shouldShowPrompt = !deviceInfo.isStandalone && (!isDismissed || isDevMode || forceShowBanner);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, Date.now().toString());
    setIsDismissed(true);
  };

  const handleInstall = async (): Promise<boolean> => {
    if ((deviceInfo.platform === 'android' || deviceInfo.platform === 'desktop') && isInstallable) {
      const success = await promptInstall();

      if (success) {
        handleDismiss();

        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'pwa_installed', {
            platform: deviceInfo.platform,
            variant,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return success;
    }

    return false;
  };

  return {
    deviceInfo,
    shouldShowPrompt,
    isInstallable: deviceInfo.platform === 'android' ? isInstallable : true,
    handleInstall,
    handleDismiss,
  };
}
