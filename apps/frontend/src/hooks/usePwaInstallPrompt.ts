import { useEffect, useMemo, useState } from "react";

type PwaAppType = "customer" | "admin";

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
  const isIos = isIosDevice();
  const isAndroid = isAndroidDevice();

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setIsDismissed(window.localStorage.getItem(storageKey) === "1");

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.localStorage.removeItem(storageKey);
      setIsDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [storageKey]);

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
