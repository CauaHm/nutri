import { parseDate } from "./dates";
import type { User } from "./types";

export interface MealItem {
  id: number | string;
  nome?: string;
  kcal: number;
  proteina: number;
  qty?: number;
}

// Formato antigo (um numero cru de kcal por refeicao) ainda e aceito.
export type RefeicaoLog = MealItem[] | number;
export type MealLog = Record<string, Record<string, RefeicaoLog>>;

export interface WaterEntry {
  date: string;
  liters: number;
}

export interface CheckEntry {
  date: string;
  status: "completo" | "parcial" | "none" | string;
}

// Cada refeicao guarda uma lista de itens (comida do catalogo ou lancamento
// livre): [{id, nome, kcal, proteina, qty}]. Formato antigo (um numero cru
// de kcal por refeicao) ainda e aceito e tratado como 1 item sem nome.
export function itensDaRefeicao(v: RefeicaoLog | undefined): MealItem[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "number" && v > 0) return [{ id: "legacy", nome: "Registro anterior", kcal: v, proteina: 0, qty: 1 }];
  return [];
}

export function somaItens(itens: MealItem[]): { kcal: number; proteina: number } {
  return itens.reduce((acc, it) => ({ kcal: acc.kcal + (Number(it.kcal) || 0), proteina: acc.proteina + (Number(it.proteina) || 0) }), { kcal: 0, proteina: 0 });
}

// Totais (kcal + proteina) de um dia, somando todas as refeicoes daquele dia.
export function totaisDoDia(mealLog: MealLog | undefined, date: string): { kcal: number; proteina: number } {
  const refeicoes = (mealLog || {})[date] || {};
  return Object.values(refeicoes).reduce(
    (acc, v) => {
      const t = somaItens(itensDaRefeicao(v));
      return { kcal: acc.kcal + t.kcal, proteina: acc.proteina + t.proteina };
    },
    { kcal: 0, proteina: 0 }
  );
}

export interface PontosStats {
  pts: number;
  calDays: number;
  waterDays: number;
  checkDays: number;
  totalDias: number;
  kcalPorDia: Record<string, number>;
}

// Regras do jogo: kcal do dia dentro da meta E proteina do dia na meta = 1pt,
// agua na meta = 1pt, treino completo = 3pts, parcial = 1pt.
export function calcPontos(
  user: Pick<User, "kcalMeta" | "waterMeta" | "proteinaMeta">,
  mealLogs: MealLog | undefined,
  waters: WaterEntry[],
  checks: CheckEntry[],
  roundStart: string | null | undefined
): PontosStats {
  const start = roundStart ? parseDate(roundStart) : new Date(0);
  let pts = 0,
    calDays = 0,
    waterDays = 0,
    checkDays = 0,
    totalDias = 0;

  const kcalPorDia: Record<string, number> = {};
  const proteinaPorDia: Record<string, number> = {};
  Object.keys(mealLogs || {}).forEach((date) => {
    const t = totaisDoDia(mealLogs, date);
    kcalPorDia[date] = t.kcal;
    proteinaPorDia[date] = t.proteina;
  });

  const allDates = new Set([...Object.keys(kcalPorDia), ...waters.map((l) => l.date), ...checks.map((l) => l.date)]);

  allDates.forEach((date) => {
    if (parseDate(date) < start) return;
    totalDias++;
    const kcal = kcalPorDia[date];
    const proteina = proteinaPorDia[date] || 0;
    const water = waters.find((l) => l.date === date);
    const check = checks.find((l) => l.date === date);
    const bateuProteina = user.proteinaMeta > 0 ? proteina >= user.proteinaMeta : true;
    if (kcal !== undefined && kcal > 0 && kcal <= user.kcalMeta && bateuProteina) {
      pts += 1;
      calDays++;
    }
    if (water && water.liters >= user.waterMeta) {
      pts += 1;
      waterDays++;
    }
    if (check) {
      if (check.status === "completo") {
        pts += 3;
        checkDays++;
      } else if (check.status === "parcial") {
        pts += 1;
        checkDays++;
      }
    }
  });

  return { pts, calDays, waterDays, checkDays, totalDias, kcalPorDia };
}
