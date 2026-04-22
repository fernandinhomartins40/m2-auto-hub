/**
 * Registro do service worker do PWA.
 *
 * O manifest agora e estatico no HTML inicial para manter a instalacao
 * confiavel no Android. Este arquivo cuida apenas do service worker.
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PWA) {
            console.log('[SW] Service Worker registered successfully:', registration.scope);
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PWA) {
                    console.log('[SW] New service worker available, reloading...');
                  }

                  if (confirm('Nova versao disponivel. Recarregar agora?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PWA) {
          console.log('[SW] Controller changed, reloading page');
        }
        window.location.reload();
      });
    });
  } else if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_PWA) {
    console.warn('[SW] Service Workers not supported in this browser');
  }
}
