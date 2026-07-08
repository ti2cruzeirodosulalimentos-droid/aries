/* ARIÉS — Service Worker mínimo e seguro para PWA (instalável).
   Estratégia network-first: sempre tenta a rede (evita servir app antigo
   após um deploy) e só usa cache como fallback quando estiver offline. */
const CACHE = "aries-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // limpa caches antigos de versões anteriores
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Navegações (abrir páginas): network-first com fallback offline para "/"
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put("/", res.clone()).catch(() => {});
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match("/")) || Response.error();
        }
      })(),
    );
  }
});
