/// <reference lib="webworker" />
export {};

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { flushQueue } from "./lib/offlineQueue";
import { API_CACHE_NAME } from "./lib/pwaConstants";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// So GET /api/kv/* e interceptado. `registerRoute` filtra por metodo GET
// por padrao, entao PUT (as escritas de verdade) nunca bate aqui — e
// qualquer rota nao registrada (auth, invites, competition, food/analyze,
// e o proprio PUT de /api/kv/*) passa direto pra rede, identico ao
// comportamento antes deste service worker existir.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/kv/"),
  new NetworkFirst({
    cacheName: API_CACHE_NAME,
    networkTimeoutSeconds: 8,
    plugins: [
      // CRITICO: nunca cachear a resposta 401 (sessao expirada) — GET
      // /api/kv/:key pode responder 401 sem a chave `value`; cachear isso
      // envenenaria o fallback offline com um "erro" no lugar do ultimo
      // dado bom conhecido.
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if ((event.data as any)?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("sync", (event: any) => {
  if (event.tag === "flush-mutations") event.waitUntil(flushQueue());
});
