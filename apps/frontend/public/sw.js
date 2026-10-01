const CACHE_NAME = "m2-pwa-shell-v2";
const APP_SHELL = ["/", "/favicon.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Navegacoes e o proprio SW devem sempre consultar a rede. Assets gerados
  // pelo Vite ja possuem hash e podem continuar no cache com seguranca.
  const isNavigation = event.request.mode === "navigate";
  const isMutableShell = requestUrl.pathname === "/sw.js" || requestUrl.pathname === "/index.html";

  event.respondWith(
    fetch(event.request, isNavigation || isMutableShell ? { cache: "no-store" } : undefined)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned)).catch(() => undefined);
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }

        return caches.match("/");
      })
  );
});
