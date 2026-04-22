import { useState, useEffect } from 'react';

// TypeScript interface seguindo padrão da comunidade (MDN + GitHub)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Declaração global para TypeScript
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      // CRÍTICO: preventDefault() ANTES de tudo (padrão MDN)
      e.preventDefault();
      console.log('[useInstallPrompt] beforeinstallprompt capturado!', {
        platforms: e.platforms,
      });
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detectar se já está instalado
    const installedHandler = () => {
      console.log('[useInstallPrompt] App instalado! (appinstalled event)');
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.error('[useInstallPrompt] Não há deferredPrompt disponível!');
      return false;
    }

    try {
      // Chamar prompt() - abre diálogo nativo do navegador
      await deferredPrompt.prompt();

      // Aguardar escolha do usuário
      const choiceResult = await deferredPrompt.userChoice;

      console.log('[useInstallPrompt] Usuário decidiu:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        console.log('[useInstallPrompt] ✅ Instalação aceita!');
        setIsInstallable(false);
        return true;
      } else {
        console.log('[useInstallPrompt] ❌ Instalação recusada');
        return false;
      }
    } catch (error) {
      console.error('[useInstallPrompt] Erro ao instalar:', error);
      return false;
    } finally {
      // SEMPRE limpar após uso (sucesso ou falha)
      setDeferredPrompt(null);
    }
  };

  return {
    isInstallable,
    promptInstall,
  };
}
