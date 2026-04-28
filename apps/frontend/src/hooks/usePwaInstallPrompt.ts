import { useEffect, useMemo, useState } from "react";

type PwaAppType = "customer" | "admin" | "mechanic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroidDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function usePwaInstallPrompt(appType: PwaAppType) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const storageKey = `pwa-install-banner-dismissed:${appType}`;
  const installedKey = `pwa-installed:${appType}`;
  const isIos = isIosDevice();
  const isAndroid = isAndroidDevice();

  useEffect(() => {
    const syncInstallState = () => {
      const installed = isStandaloneMode();
      const hadInstalledBefore = window.localStorage.getItem(installedKey) === "1";

      setIsInstalled(installed);
      setIsDismissed(window.localStorage.getItem(storageKey) === "1");

      // If the app had already been installed once and is no longer in standalone,
      // assume it was uninstalled and bring the install banner back.
      if (!installed && hadInstalledBefore) {
        window.localStorage.removeItem(installedKey);
        window.localStorage.removeItem(storageKey);
        setIsDismissed(false);
      }
    };

    syncInstallState();
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.localStorage.setItem(installedKey, "1");
      window.localStorage.removeItem(storageKey);
      setIsDismissed(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncInstallState();
      }
    };

    const handleWindowFocus = () => {
      syncInstallState();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    standaloneQuery.addEventListener("change", handleWindowFocus);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      standaloneQuery.removeEventListener("change", handleWindowFocus);
    };
  }, [installedKey, storageKey]);

  const dismiss = () => {
    window.localStorage.setItem(storageKey, "1");
    setIsDismissed(true);
  };

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return false;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        window.localStorage.setItem(installedKey, "1");
        window.localStorage.removeItem(storageKey);
        setIsDismissed(false);
        return true;
      }

      return false;
    } finally {
      setIsInstalling(false);
    }
  };

  const shouldShow = useMemo(() => {
    if (isInstalled || isDismissed) {
      return false;
    }

    return isIos || isAndroid || !!deferredPrompt;
  }, [deferredPrompt, isAndroid, isDismissed, isInstalled, isIos]);

  return {
    isIos,
    isAndroid,
    isInstalled,
    isInstalling,
    canPromptInstall: !!deferredPrompt,
    shouldShow,
    dismiss,
    promptInstall,
  };
}
