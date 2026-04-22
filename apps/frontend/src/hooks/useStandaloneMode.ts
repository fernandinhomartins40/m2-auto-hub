import { useState, useEffect } from 'react';

/**
 * Hook para detectar se o app está rodando em modo standalone (PWA instalado)
 * Também detecta se é iOS standalone (home screen)
 */
export function useStandaloneMode() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);

  useEffect(() => {
    // Detectar modo standalone via media query
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    // Detectar iOS standalone (adicionar à home screen)
    const isIOSStandaloneMode = (window.navigator as any).standalone === true;

    // Detectar Android standalone
    const isAndroidStandalone = standaloneQuery.matches;

    setIsStandalone(isAndroidStandalone || isIOSStandaloneMode);
    setIsIOSStandalone(isIOSStandaloneMode);

    // Listener para mudanças no display mode
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches || isIOSStandaloneMode);
    };

    standaloneQuery.addEventListener('change', handleChange);

    return () => {
      standaloneQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    isStandalone,
    isIOSStandalone,
    isBrowser: !isStandalone,
  };
}
