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

// ---- Fase 2: notificacoes push -------------------------------------------

// `renotify` existe de verdade na Notification API (suportado pelos
// browsers) mas o lib.dom.d.ts do TypeScript nao o declara em
// NotificationOptions — lacuna conhecida da lib, nao um erro nosso. Estende
// localmente em vez de silenciar o typecheck com `any`.
interface NotificationOptionsComRenotify extends NotificationOptions {
  renotify?: boolean;
}

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; tipo?: string; url?: string } = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; } // um push pode legitimamente chegar sem payload/nao-JSON — nunca deixa isso estourar
  const tag = data.tipo ? `rm-${data.tipo}` : "rm-generic"; // mesmo tipo substitui uma notificacao ainda visivel desse tipo; tipos diferentes nunca se atropelam
  const options: NotificationOptionsComRenotify = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: true,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "Rotina & Metas", options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil((async () => {
    // Navegacao do app e uma pilha em memoria, sem URL — so da pra
    // focar/abrir na raiz nesta fase, sem deep-link pra tela especifica.
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = allClients.find((c) => "focus" in c);
    if (existing) { await (existing as WindowClient).focus(); return; }
    await self.clients.openWindow(targetUrl);
  })());
});
