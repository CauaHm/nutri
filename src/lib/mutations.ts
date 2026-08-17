// Funcoes puras de aplicacao de mutacao — a MESMA logica que antes vivia
// inline em useAppData.ts, extraida pra ser usada tanto na atualizacao
// otimista local (useAppData.ts) quanto na reconciliacao do flush da fila
// offline (offlineQueue.ts). Isso garante que os dois caminhos nunca
// divergem. Sem I/O aqui — so transformacoes de dados, e por isso este
// arquivo e seguro de importar tanto de `window` quanto do service worker.
//
// Os tipos (MealLog/WaterEntry/CheckEntry/MealItem/WeightLog) vem de
// ./offlineQueue (nao de ./points ou ./useAppData) por design — ver o
// comentario grande em offlineQueue.ts sobre por que o projeto TS do
// service worker nao pode alcancar esses dois arquivos. Estruturalmente
// identicos aos tipos "reais", entao chamadas de useAppData.ts (que usa os
// tipos de points.ts/useAppData.ts) continuam type-checando normalmente.
import type { MealLog, WaterEntry, CheckEntry, MealItem, WeightLog, MutationIntent } from "./offlineQueue";

// Repetido aqui (nao importado de ./points) pelo mesmo motivo dos tipos
// acima — e uma funcao pura de ~4 linhas, duplicar e mais barato que
// arrastar points.ts (e toda a arvore dele) pro projeto do service worker.
function itensDaRefeicao(v: MealItem[] | number | undefined): MealItem[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "number" && v > 0) return [{ id: "legacy", nome: "Registro anterior", kcal: v, proteina: 0, qty: 1 }];
  return [];
}

export function applyAddFood(mealLog: MealLog, date: string, mealId: string, item: MealItem): MealLog {
  const dia = { ...(mealLog[date] || {}) };
  const itens = itensDaRefeicao(dia[mealId]);
  if (itens.some((it) => it.id === item.id)) return mealLog; // idempotente — ja aplicado
  dia[mealId] = [...itens, item];
  return { ...mealLog, [date]: dia };
}

export function applyRemoveFood(mealLog: MealLog, date: string, mealId: string, itemId: string | number): MealLog {
  const dia = { ...(mealLog[date] || {}) };
  dia[mealId] = itensDaRefeicao(dia[mealId]).filter((it) => it.id !== itemId); // naturalmente idempotente
  return { ...mealLog, [date]: dia };
}

export function applySetWater(waters: WaterEntry[], date: string, liters: number): WaterEntry[] {
  return waters.find((l) => l.date === date) ? waters.map((l) => (l.date === date ? { ...l, liters } : l)) : [{ date, liters }, ...waters];
}

export function applySetCheck(checks: CheckEntry[], date: string, status: string): CheckEntry[] {
  return checks.find((l) => l.date === date) ? checks.map((l) => (l.date === date ? { ...l, status } : l)) : [{ date, status }, ...checks];
}

export function applyAddWeightLog(weightLogs: WeightLog[], entry: WeightLog): WeightLog[] {
  if (weightLogs.some((l) => l.id === entry.id)) return weightLogs; // idempotente
  return [entry, ...weightLogs];
}

// Aplica uma intencao enfileirada sobre o estado atual (buscado do servidor
// no momento do flush — nunca sobre um snapshot local antigo). `current`
// pode vir `undefined`/`null` do GET (chave nunca escrita antes), daí o
// default por tipo abaixo.
export function applyIntent(current: any, intent: MutationIntent): any {
  switch (intent.tipo) {
    case "addFood":
      return applyAddFood((current || {}) as MealLog, intent.data, intent.mealId, intent.item);
    case "removeFood":
      return applyRemoveFood((current || {}) as MealLog, intent.data, intent.mealId, intent.itemId);
    case "setWater":
      return applySetWater((current || []) as WaterEntry[], intent.data, intent.litros);
    case "setCheck":
      return applySetCheck((current || []) as CheckEntry[], intent.data, intent.status);
    case "addWeightLog":
      return applyAddWeightLog((current || []) as WeightLog[], intent.entry);
    default: {
      const _exhaustive: never = intent;
      return current;
    }
  }
}

export function keyForIntent(userId: string, intent: MutationIntent): string {
  switch (intent.tipo) {
    case "addFood":
    case "removeFood":
      return `${userId}_refeicoes_log`;
    case "setWater":
      return `${userId}_water`;
    case "setCheck":
      return `${userId}_check`;
    case "addWeightLog":
      return `${userId}_wlogs`;
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
