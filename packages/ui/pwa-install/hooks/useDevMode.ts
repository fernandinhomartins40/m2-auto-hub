import { useState, useEffect } from 'react';

/**
 * Hook para forçar exibição de componentes PWA em desenvolvimento
 * Útil para testar sem precisar de dispositivo móvel
 */
export function useDevMode() {
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    // Verificar se está forçando exibição via localStorage
    const forced = localStorage.getItem('pwa-force-show') === 'true';
    setForceShow(forced);

    // Disponibilizar função global para ativar/desativar
    if (typeof window !== 'undefined') {
      (window as any).togglePWAForceShow = () => {
        const newValue = !forced;
        localStorage.setItem('pwa-force-show', String(newValue));
        setForceShow(newValue);
        console.log(`PWA Force Show: ${newValue ? 'ENABLED' : 'DISABLED'}`);
        window.location.reload();
      };
    }
  }, []);

  // Retorna true se estiver em dev OU se forçar exibição
  const isDev = Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);

  return {
    isDevMode: isDev || forceShow,
    forceShow,
    isDev,
  };
}
