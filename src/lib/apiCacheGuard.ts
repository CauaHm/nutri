// Isolamento de cache por usuario. 100% no cliente, sem precisar mandar
// mensagem pro service worker — o Cache Storage e o mesmo storage visto de
// `window` e do SW, entao `caches.delete` daqui ja basta. Chamado de
// useAuth.ts a cada mudanca de `user._id` (login/signup/refresh de
// boot/logout) — evita que a resposta de GET /api/kv/* cacheada pelo SW
// pra um usuario apareca, mesmo que por um instante, pra outro usuario no
// mesmo navegador.
import { API_CACHE_NAME } from "./pwaConstants";

const LAST_UID_KEY = "rm_last_uid";

export async function ensureCacheIsolation(userId: string | null): Promise<void> {
  if (typeof caches === "undefined") return;
  const lastUid = localStorage.getItem(LAST_UID_KEY);
  if (!userId) {
    await caches.delete(API_CACHE_NAME);
    localStorage.removeItem(LAST_UID_KEY);
    return;
  }
  if (lastUid && lastUid !== userId) await caches.delete(API_CACHE_NAME);
  localStorage.setItem(LAST_UID_KEY, userId);
}
