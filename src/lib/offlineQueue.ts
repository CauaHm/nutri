// Fila de mutacoes offline — IndexedDB (`rm-offline-queue`, store
// `mutations`, keyPath "id") + engine de flush (GET -> aplica -> PUT).
// Importado tanto pela janela (app) quanto pelo service worker (src/sw.ts,
// no listener de `sync`) — por isso todo acesso a `window`/`document` abaixo
// esta atras de um guard que evita o identificador cru. Um acesso nao
// protegido quebraria o boot do SW (sem `window`) e derrubaria o precache
// inteiro.
import { applyIntent, keyForIntent } from "./mutations";

// Formatos de dado duplicados aqui (em vez de importados de ./points e
// ./useAppData) DE PROPOSITO: tsconfig.sw.json e um projeto TS `composite`,
// que exige que TODO arquivo alcancado pela arvore de imports esteja
// listado no seu `include` — mesmo um `import type`. Importar de
// ./points.ts arrastaria dates.ts + types.ts; importar de ./useAppData.ts
// arrastaria useBodyComp/useRPG/useCompetition/defaults/liveWorkout (e
// tudo o que esses importam), inflando enormemente o projeto do service
// worker e arriscando puxar codigo com APIs de DOM incompativeis com a lib
// "WebWorker". A tipagem estrutural do TS garante que estes formatos
// continuam 100% compativeis com os "reais" (MealItem/MealLog/WaterEntry/
// CheckEntry de points.ts, WeightLog de useAppData.ts) sem precisar
// importar literalmente o mesmo arquivo — qualquer mudanca de forma nos
// originais precisa ser espelhada aqui manualmente.
export interface MealItem {
  id: number | string;
  nome?: string;
  kcal: number;
  proteina: number;
  qty?: number;
}
export type MealLog = Record<string, Record<string, MealItem[] | number>>;
export interface WaterEntry {
  date: string;
  liters: number;
}
export interface CheckEntry {
  date: string;
  status: string;
}
export interface WeightLog {
  id: number;
  ex: string;
  data: string;
  kg: string;
  sets: string;
  reps: string;
}

export type MutationIntent =
  | { tipo: "addFood"; data: string; mealId: string; item: MealItem }
  | { tipo: "removeFood"; data: string; mealId: string; itemId: string | number }
  | { tipo: "setWater"; data: string; litros: number }
  | { tipo: "setCheck"; data: string; status: string }
  | { tipo: "addWeightLog"; entry: WeightLog }; // id ja gerado no ponto de chamada (nao Omit<WeightLog,"id">) — reprocessar a mesma intencao duas vezes nao pode criar dois ids diferentes.

export interface QueuedMutation {
  id: string; // crypto.randomUUID() — gerado so em contexto de janela, enqueue nunca acontece dentro do proprio SW
  criadoEm: number;
  tentativas: number;
  status: "pending" | "problematic";
  proximaTentativaEm: number;
  payload: { kind: "intent"; userId: string; intent: MutationIntent } | { kind: "raw"; key: string; value: any };
}

const DB_NAME = "rm-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";
const FLUSH_LOCK_NAME = "rm-offline-queue-flush";
const MAX_TENTATIVAS = 5;
const MAX_BACKOFF_MS = 300000;

// ---------------------------------------------------------------------------
// IndexedDB — wrapper fino a mao, so as 4 operacoes que precisamos.
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;
function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = openDB();
  return dbPromise;
}

async function idbGetAll(): Promise<QueuedMutation[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedMutation[]);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(item: QueuedMutation): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------------------
// Espelho em memoria (pra useSyncExternalStore) — mantido em lockstep com
// toda escrita no IndexedDB feita a partir deste contexto (janela ou SW).
// ---------------------------------------------------------------------------

export interface QueueSnapshot {
  pending: number;
  problematic: number;
  items: QueuedMutation[];
}

const EMPTY_SNAPSHOT: QueueSnapshot = { pending: 0, problematic: 0, items: [] };

let snapshot: QueueSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

function computeSnapshot(items: QueuedMutation[]): QueueSnapshot {
  const sorted = [...items].sort((a, b) => a.criadoEm - b.criadoEm);
  return {
    pending: sorted.filter((i) => i.status === "pending").length,
    problematic: sorted.filter((i) => i.status === "problematic").length,
    items: sorted,
  };
}

async function refreshSnapshot(): Promise<void> {
  const items = await idbGetAll();
  snapshot = computeSnapshot(items);
  listeners.forEach((l) => l());
}

// Hidratacao unica no carregamento do modulo.
const hydration = refreshSnapshot().catch(() => {
  // sem IndexedDB (contexto exotico/privado) — segue com a fila vazia, sem quebrar o boot do app.
});

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSnapshot(): QueueSnapshot {
  return snapshot;
}

// ---------------------------------------------------------------------------
// Enfileiramento
// ---------------------------------------------------------------------------

function newQueuedMutation(payload: QueuedMutation["payload"]): QueuedMutation {
  return {
    id: crypto.randomUUID(),
    criadoEm: Date.now(),
    tentativas: 0,
    status: "pending",
    proximaTentativaEm: 0,
    payload,
  };
}

async function enqueue(payload: QueuedMutation["payload"]): Promise<void> {
  const item = newQueuedMutation(payload);
  await idbPut(item);
  await refreshSnapshot();
  triggerSync();
}

export async function enqueueIntent(userId: string, intent: MutationIntent): Promise<void> {
  await enqueue({ kind: "intent", userId, intent });
}

export async function enqueueRawSet(key: string, value: any): Promise<void> {
  await enqueue({ kind: "raw", key, value });
}

// Dispara uma tentativa de sincronizacao: registra o Background Sync
// (quando suportado — nao existe em todo navegador/contexto) e, alem disso,
// tenta um flush imediato se ja estamos online, pra manter a sensacao de
// "instantaneo" que o caminho online sempre teve, sem depender do
// agendamento proprio do Background Sync.
function triggerSync(): void {
  if (typeof navigator === "undefined") return;
  // `.serviceWorker` so existe em Navigator (janela), nao em WorkerNavigator
  // (contexto do proprio SW) — `any` aqui evita depender de um nome de tipo
  // exclusivo de um dos dois libs (DOM vs WebWorker), ja que este arquivo e
  // type-checado sob ambos os tsconfigs.
  const nav = navigator as any;
  if (nav.serviceWorker?.ready) {
    nav.serviceWorker.ready
      .then((reg: any) => reg?.sync?.register?.("flush-mutations"))
      .catch(() => {
        // Background Sync indisponivel (navegador sem suporte, ou SW ainda nao ativo) — sem problema, ha o fallback abaixo.
      });
  }
  if (navigator.onLine) {
    flushQueue().catch(() => {
      // flushQueue ja trata suas proprias falhas internamente; isto e so uma rede de seguranca.
    });
  }
}

// `window`/`document` nao existem no escopo global do service worker (nem
// como identificadores declarados sob lib "WebWorker") — passar por
// `globalThis as any` em vez do identificador cru `window` evita erro de
// compilacao sob tsconfig.sw.json, mantendo o mesmo teste em runtime que
// `typeof window !== "undefined"` faria.
const globalWindow: any = (globalThis as any).window;
if (globalWindow) {
  const globalDocument: any = (globalThis as any).document;
  globalWindow.addEventListener("online", () => {
    flushQueue();
  });
  globalDocument.addEventListener("visibilitychange", () => {
    if (globalDocument.visibilityState === "visible") flushQueue();
  });
}

// ---------------------------------------------------------------------------
// Flush — GET estado atual -> aplica intencao -> PUT. Protegido por Web
// Locks pra nunca deixar um flush disparado pela aba correr ao mesmo tempo
// que um disparado pelo Background Sync no SW.
// ---------------------------------------------------------------------------

function backoffMs(tentativas: number): number {
  return Math.min(MAX_BACKOFF_MS, 2000 * 2 ** tentativas);
}

async function flushOnce(): Promise<void> {
  await hydration;
  const items = await idbGetAll();
  const pendentes = items.filter((i) => i.status !== "problematic").sort((a, b) => a.criadoEm - b.criadoEm);
  const now = Date.now();

  for (const item of pendentes) {
    if (item.status === "problematic") continue;
    if (now < item.proximaTentativaEm) continue;

    const key = item.payload.kind === "raw" ? item.payload.key : keyForIntent(item.payload.userId, item.payload.intent);

    let getRes: Response;
    try {
      getRes = await fetch(`/api/kv/${encodeURIComponent(key)}`, { cache: "no-store" });
    } catch {
      // sem rede — para o pass inteiro (proxima tentativa disparada pelo proximo evento online/visibilitychange/sync).
      return;
    }

    if (getRes.status === 401) {
      // sessao expirou — nao e falha da mutacao, aborta o pass inteiro silenciosamente.
      return;
    }
    if (!getRes.ok) {
      await markFailure(item);
      return;
    }

    let current: any;
    try {
      const body = await getRes.json();
      current = body.value;
    } catch {
      await markFailure(item);
      return;
    }

    const next = item.payload.kind === "raw" ? item.payload.value : applyIntent(current, item.payload.intent);

    let putRes: Response;
    try {
      putRes = await fetch(`/api/kv/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: next }),
      });
    } catch {
      return;
    }

    if (putRes.status === 401) {
      return;
    }
    if (!putRes.ok) {
      await markFailure(item);
      return;
    }

    await idbDelete(item.id);
    await refreshSnapshot();
    // sucesso — continua pro proximo item da fila.
  }
}

async function markFailure(item: QueuedMutation): Promise<void> {
  const tentativas = item.tentativas + 1;
  const next: QueuedMutation = {
    ...item,
    tentativas,
    proximaTentativaEm: Date.now() + backoffMs(tentativas),
    status: tentativas >= MAX_TENTATIVAS ? "problematic" : "pending",
  };
  await idbPut(next);
  await refreshSnapshot();
}

export async function flushQueue(): Promise<void> {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    await navigator.locks.request(FLUSH_LOCK_NAME, async () => {
      await flushOnce();
    });
    return;
  }
  // sem Web Locks (navegador antigo/contexto exotico) — segue sem a trava (baixo risco pra fila de 1-2 pessoas).
  await flushOnce();
}
