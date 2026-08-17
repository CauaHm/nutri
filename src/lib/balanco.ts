// Balanco energetico (dia/semana/mes) — calculo puro, testavel sem React.
// gastoTotal = TDEE_base (TMB x fator, ja resolvido pelo chamador) + soma
// do kcalEstimado das atividades extras do dia. Ausencia de registro de
// refeicao NUNCA vira ingestao 0 pra fins de saldo/media — esses dias
// entram como incompletos e ficam de fora das agregacoes (ver AGENTS.md
// da feature: "esse e o erro que faz o app mostrar deficits fantasiosos").

import { addDays } from "./rpg";
import { totaisDoDia, type MealLog } from "./points";
import { type AtividadeExtra } from "./atividades";

export const KCAL_POR_KG = 7700;

export interface BalancoDia {
  date: string;
  ingestao: number;
  gastoBase: number;
  gastoExtra: number;
  gasto: number;
  saldo: number; // ingestao - gasto; negativo = deficit
  completo: boolean; // teve refeicao registrada nesse dia
}

// Map construido uma unica vez por atividades[] — nunca .filter/.find dentro
// de um loop de N dias (o mesmo anti-padrao que calcPontos tem em points.ts).
function gastoExtraPorDiaMap(atividades: AtividadeExtra[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of atividades) m.set(a.date, (m.get(a.date) || 0) + (Number(a.kcalEstimado) || 0));
  return m;
}

function balancoDoDiaComMapa(date: string, mealLog: MealLog | undefined, gastoExtraMap: Map<string, number>, tdeeBase: number): BalancoDia {
  const totais = totaisDoDia(mealLog, date);
  const gastoExtra = gastoExtraMap.get(date) || 0;
  const gasto = tdeeBase + gastoExtra;
  const completo = totais.kcal > 0;
  return {
    date,
    ingestao: Math.round(totais.kcal),
    gastoBase: Math.round(tdeeBase),
    gastoExtra: Math.round(gastoExtra),
    gasto: Math.round(gasto),
    saldo: completo ? Math.round(totais.kcal - gasto) : 0,
    completo,
  };
}

export function balancoDoDia(date: string, mealLog: MealLog | undefined, atividades: AtividadeExtra[], tdeeBase: number): BalancoDia {
  return balancoDoDiaComMapa(date, mealLog, gastoExtraPorDiaMap(atividades), tdeeBase);
}

export interface BalancoPeriodo {
  dias: BalancoDia[];
  total: number; // soma do saldo, so dias completos
  media: number; // total / diasCompletos (0 se nenhum dia completo)
  diasCompletos: number;
  perdaEstimadaKg: number; // |total| / 7700, aproximacao
}

export function datesDoPeriodo(inicio: string, dias: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < dias; i++) out.push(addDays(inicio, i));
  return out;
}

export function balancoPeriodo(dates: string[], mealLog: MealLog | undefined, atividades: AtividadeExtra[], tdeeBase: number): BalancoPeriodo {
  const gastoExtraMap = gastoExtraPorDiaMap(atividades);
  const diasList = dates.map((d) => balancoDoDiaComMapa(d, mealLog, gastoExtraMap, tdeeBase));
  const completos = diasList.filter((d) => d.completo);
  const total = completos.reduce((s, d) => s + d.saldo, 0);
  const diasCompletos = completos.length;
  const media = diasCompletos > 0 ? total / diasCompletos : 0;
  return { dias: diasList, total, media, diasCompletos, perdaEstimadaKg: Math.abs(total) / KCAL_POR_KG };
}

// ---------------------------------------------------------------------------
// Reconciliacao de TDEE real — so calcula com >=21 dias no periodo e >=80%
// de aderencia de registro. Usa media movel de 7 dias do peso nas duas
// pontas (nunca uma pesagem isolada) e rejeita fora de 1.0-2.5x TMB.
// ---------------------------------------------------------------------------

const MIN_DIAS_RECONCILIACAO = 21;
const MIN_ADERENCIA_RECONCILIACAO = 0.8;

export interface PesoEntry {
  date: string;
  peso: number;
}

// Media dos pesos registrados dentro de +-3 dias da data alvo (aproxima uma
// "media movel de 7 dias" com pesagens esparsas — a maioria dos usuarios
// pesa 1x/semana, nao todo dia).
export function pesoMedioProximoDe(pesos: PesoEntry[], dataAlvo: string): number | null {
  const janela = new Set(datesDoPeriodo(addDays(dataAlvo, -3), 7));
  const dentro = pesos.filter((p) => janela.has(p.date));
  if (!dentro.length) return null;
  return dentro.reduce((s, p) => s + p.peso, 0) / dentro.length;
}

export interface TdeeRealResultado {
  valor: number;
  confiavel: boolean;
  motivo?: string;
  diasFaltando?: number;
}

export function tdeeReal(dates: string[], mealLog: MealLog | undefined, pesos: PesoEntry[], tmb: number | null): TdeeRealResultado {
  const totalDias = dates.length;
  if (totalDias < MIN_DIAS_RECONCILIACAO) {
    return { valor: 0, confiavel: false, motivo: `ainda precisa de mais dias de registro (${MIN_DIAS_RECONCILIACAO - totalDias} faltando)`, diasFaltando: MIN_DIAS_RECONCILIACAO - totalDias };
  }
  const kcalPorDia = new Map(dates.map((d) => [d, totaisDoDia(mealLog, d).kcal] as const));
  const completos = dates.filter((d) => (kcalPorDia.get(d) || 0) > 0);
  const aderencia = completos.length / totalDias;
  if (aderencia < MIN_ADERENCIA_RECONCILIACAO) {
    const diasNecessarios = Math.ceil(totalDias * MIN_ADERENCIA_RECONCILIACAO) - completos.length;
    return { valor: 0, confiavel: false, motivo: `aderência de registro baixa (${Math.round(aderencia * 100)}%) — registre mais ${Math.max(1, diasNecessarios)} dias pra calcular`, diasFaltando: Math.max(1, diasNecessarios) };
  }

  const mediaIngestao = completos.reduce((s, d) => s + (kcalPorDia.get(d) || 0), 0) / completos.length;

  const pesoInicial = pesoMedioProximoDe(pesos, dates[0]);
  const pesoFinal = pesoMedioProximoDe(pesos, dates[dates.length - 1]);
  if (pesoInicial === null || pesoFinal === null) {
    return { valor: 0, confiavel: false, motivo: "sem pesagens perto do início ou do fim do período pra medir a variação de peso" };
  }

  const variacaoKg = pesoFinal - pesoInicial;
  const valor = mediaIngestao + (variacaoKg * KCAL_POR_KG) / totalDias;

  if (tmb && (valor < tmb * 1.0 || valor > tmb * 2.5)) {
    return { valor, confiavel: false, motivo: "resultado fora da faixa esperada (1.0x-2.5x da sua TMB) — provavelmente dado ruim no período, não deu pra confiar" };
  }

  return { valor: Math.round(valor), confiavel: true };
}

// ---------------------------------------------------------------------------
// Perda real medida (bodyCompHistorico) num periodo — pra comparar com a
// perda estimada pelo saldo. null quando nao ha pesagem perto de uma das
// pontas (nao inventa numero). Positivo = perdeu peso.
// ---------------------------------------------------------------------------

export function perdaRealNoPeriodo(pesos: PesoEntry[], dataInicio: string, dataFim: string): number | null {
  const inicial = pesoMedioProximoDe(pesos, dataInicio);
  const final = pesoMedioProximoDe(pesos, dataFim);
  if (inicial === null || final === null) return null;
  return Math.round((inicial - final) * 100) / 100;
}
