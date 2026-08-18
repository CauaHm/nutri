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

// Isolamento de subscription push por usuario — mesma ideia de
// ensureCacheIsolation acima, mas uma chave PROPRIA (`rm_last_push_uid`,
// deliberadamente separada de LAST_UID_KEY) e comportamento
// deliberadamente ASSIMETRICO: so desinscreve quando um usuario DIFERENTE
// esta prestes a ficar ativo neste aparelho, nunca em todo logout.
//
// Por que: a mesma pessoa deslogando/logando de novo na propria conta nao
// deveria ter que reconceder a permissao de notificacao toda vez (chato, sem
// ganho de seguranca nenhum) — mas se a pessoa A desloga e a pessoa B loga
// no mesmo aparelho compartilhado, a subscription de A NAO pode continuar
// recebendo push da conta de B.
const LAST_PUSH_UID_KEY = "rm_last_push_uid";

export async function ensurePushIsolation(userId: string | null): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const lastUid = localStorage.getItem(LAST_PUSH_UID_KEY);
  if (!userId) return; // logout: no-op deliberado, ver nota acima
  if (lastUid && lastUid !== userId) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        fetch("/api/push/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => {});
      }
    } catch {
      // nunca bloqueia login por causa disso
    }
  }
  localStorage.setItem(LAST_PUSH_UID_KEY, userId);
}
