import { parseDate } from "@/lib/dates";

// Cada refeicao guarda uma lista de itens (comida do catalogo ou lancamento
// livre): [{id, nome, kcal, proteina, qty}]. Formato antigo (um numero cru
// de kcal por refeicao) ainda e aceito e tratado como 1 item sem nome.
export function itensDaRefeicao(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "number" && v > 0) return [{ id: "legacy", nome: "Registro anterior", kcal: v, proteina: 0, qty: 1 }];
  return [];
}

export function somaItens(itens) {
  return itens.reduce((acc, it) => ({ kcal: acc.kcal + (Number(it.kcal) || 0), proteina: acc.proteina + (Number(it.proteina) || 0) }), { kcal: 0, proteina: 0 });
}

// Totais (kcal + proteina) de um dia, somando todas as refeicoes daquele dia.
export function totaisDoDia(mealLog, date) {
  const refeicoes = (mealLog || {})[date] || {};
  return Object.values(refeicoes).reduce(
    (acc, v) => {
      const t = somaItens(itensDaRefeicao(v));
      return { kcal: acc.kcal + t.kcal, proteina: acc.proteina + t.proteina };
    },
    { kcal: 0, proteina: 0 }
  );
}

// Regras do jogo: kcal do dia dentro da meta = 1pt, agua na meta = 1pt,
// treino completo = 3pts, parcial = 1pt.
export function calcPontos(user, mealLogs, waters, checks, roundStart) {
  const start = roundStart ? parseDate(roundStart) : new Date(0);
  let pts = 0,
    calDays = 0,
    waterDays = 0,
    checkDays = 0,
    totalDias = 0;

  const kcalPorDia = {};
  Object.keys(mealLogs || {}).forEach((date) => {
    kcalPorDia[date] = totaisDoDia(mealLogs, date).kcal;
  });

  const allDates = new Set([...Object.keys(kcalPorDia), ...waters.map((l) => l.date), ...checks.map((l) => l.date)]);

  allDates.forEach((date) => {
    if (parseDate(date) < start) return;
    totalDias++;
    const kcal = kcalPorDia[date];
    const water = waters.find((l) => l.date === date);
    const check = checks.find((l) => l.date === date);
    if (kcal !== undefined && kcal > 0 && kcal <= user.kcalMeta) {
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
