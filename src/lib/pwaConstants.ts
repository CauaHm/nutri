// Nome do cache de API compartilhado entre o service worker (src/sw.ts) e o
// codigo que roda na janela (apiCacheGuard.ts) — precisa viver num arquivo
// separado dos dois pra nao criar import circular entre eles.
export const API_CACHE_NAME = "rm-api-cache";
