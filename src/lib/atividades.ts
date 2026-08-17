// Atividades extras — registro avulso de atividade fisica (fora do treino
// planejado, ou o proprio treino planejado no Modo Preciso — ver
// useBodyComp.ts/BodyCompConfig.modoGasto). Calculo de kcal 100% puro aqui,
// zero I/O; persistencia fica em useAppData.ts, igual todo o resto do app.
//
// NOTA: date usa o mesmo formato DD/MM/AAAA de dates.ts (todayStr/parseDate),
// nao YYYY-MM-DD — consistente com CheckEntry/WaterEntry/mealLog.

export type TipoAtividade =
  | "corrida" | "caminhada" | "bike" | "cardio"
  | "esporte" | "natacao" | "funcional" | "outro";

export type Intensidade = "leve" | "moderada" | "intensa";

export interface AtividadeExtra {
  id: string; // uuid local (crypto.randomUUID)
  date: string; // DD/MM/AAAA
  tipo: TipoAtividade;
  duracaoMin: number;
  distanciaKm?: number;
  intensidade: Intensidade;
  kcalEstimado: number; // calculado no momento do registro, guardado (nao recalculado depois)
  nota?: string;
}

export interface TipoAtividadeInfo {
  key: TipoAtividade;
  label: string;
  emoji: string;
  mets: Record<Intensidade, number>;
  aceitaDistancia: boolean;
}

// Tabela de METs — Leve / Moderada / Intensa por tipo.
export const TIPOS_ATIVIDADE: TipoAtividadeInfo[] = [
  { key: "corrida", label: "Corrida", emoji: "🏃", mets: { leve: 8.0, moderada: 10.0, intensa: 12.5 }, aceitaDistancia: true },
  { key: "caminhada", label: "Caminhada", emoji: "🚶", mets: { leve: 3.0, moderada: 4.3, intensa: 5.5 }, aceitaDistancia: true },
  { key: "bike", label: "Bike", emoji: "🚴", mets: { leve: 5.5, moderada: 8.0, intensa: 11.0 }, aceitaDistancia: true },
  { key: "cardio", label: "Cardio", emoji: "🏋️", mets: { leve: 5.0, moderada: 7.0, intensa: 9.5 }, aceitaDistancia: false },
  { key: "esporte", label: "Esporte", emoji: "⚽", mets: { leve: 5.0, moderada: 7.5, intensa: 10.0 }, aceitaDistancia: false },
  { key: "natacao", label: "Natação", emoji: "🏊", mets: { leve: 5.5, moderada: 8.0, intensa: 10.5 }, aceitaDistancia: false },
  { key: "funcional", label: "Funcional", emoji: "💪", mets: { leve: 5.0, moderada: 8.0, intensa: 11.0 }, aceitaDistancia: false },
  { key: "outro", label: "Outro", emoji: "✨", mets: { leve: 3.5, moderada: 5.0, intensa: 7.0 }, aceitaDistancia: false },
];

// Fallback pra contas criadas antes desse campo existir no banco (doc antigo
// sem minutosAtivosMeta) — nunca confie em user.minutosAtivosMeta sem isso.
export const MINUTOS_ATIVOS_META_PADRAO = 45;

export function infoDoTipo(tipo: TipoAtividade): TipoAtividadeInfo {
  return TIPOS_ATIVIDADE.find((t) => t.key === tipo) || TIPOS_ATIVIDADE[TIPOS_ATIVIDADE.length - 1];
}

export const INTENSIDADES: { key: Intensidade; label: string }[] = [
  { key: "leve", label: "Leve" },
  { key: "moderada", label: "Moderada" },
  { key: "intensa", label: "Intensa" },
];

// Refinamento por ritmo (corrida/caminhada/bike com distancia informada) —
// escolhe o MET pela velocidade em vez da intensidade declarada, mais
// preciso. Faixas de corrida vieram explicitas do pedido; caminhada/bike
// seguem a mesma logica (~Compendium of Physical Activities), ajustavel.
function metPorRitmo(tipo: TipoAtividade, kmh: number): number | null {
  if (tipo === "corrida") {
    if (kmh <= 8) return 8.0;
    if (kmh <= 11) return 10.0;
    return 12.5;
  }
  if (tipo === "caminhada") {
    if (kmh <= 4) return 3.0;
    if (kmh <= 6) return 4.3;
    return 5.5;
  }
  if (tipo === "bike") {
    if (kmh <= 16) return 5.5;
    if (kmh <= 25) return 8.0;
    return 11.0;
  }
  return null;
}

export function resolveMET(tipo: TipoAtividade, intensidade: Intensidade, duracaoMin: number, distanciaKm?: number | null): number {
  const info = infoDoTipo(tipo);
  if (info.aceitaDistancia && distanciaKm && distanciaKm > 0 && duracaoMin > 0) {
    const kmh = distanciaKm / (duracaoMin / 60);
    const met = metPorRitmo(tipo, kmh);
    if (met !== null) return met;
  }
  return info.mets[intensidade];
}

// kcal = MET x 3.5 x peso(kg) / 200 x duracaoMin
export function calcKcalAtividade(input: { tipo: TipoAtividade; duracaoMin: number; intensidade: Intensidade; distanciaKm?: number | null; pesoKg: number }): number {
  if (!input.duracaoMin || input.duracaoMin <= 0 || !input.pesoKg || input.pesoKg <= 0) return 0;
  const met = resolveMET(input.tipo, input.intensidade, input.duracaoMin, input.distanciaKm);
  return Math.round(((met * 3.5 * input.pesoKg) / 200) * input.duracaoMin);
}

// ---------------------------------------------------------------------------
// Agregacoes por dia/janela — usadas por Home, RPG (RES) e Balanco.
// ---------------------------------------------------------------------------

export function atividadesDoDia(atividades: AtividadeExtra[], date: string): AtividadeExtra[] {
  return atividades.filter((a) => a.date === date);
}

export function gastoExtraDoDia(atividades: AtividadeExtra[], date: string): number {
  return atividadesDoDia(atividades, date).reduce((s, a) => s + (Number(a.kcalEstimado) || 0), 0);
}

export function minutosExtraDoDia(atividades: AtividadeExtra[], date: string): number {
  return atividadesDoDia(atividades, date).reduce((s, a) => s + (Number(a.duracaoMin) || 0), 0);
}

export function minutosExtraNaJanela(atividades: AtividadeExtra[], dates: string[]): number {
  const set = new Set(dates);
  return atividades.filter((a) => set.has(a.date)).reduce((s, a) => s + (Number(a.duracaoMin) || 0), 0);
}

// ---------------------------------------------------------------------------
// Reposicao calorica em dias de gasto extra alto — repoe 60% do gasto extra,
// nunca deixando a ingestao sugerida menos o gasto extra cair abaixo da TMB
// (piso inegociavel). So se aplica acima do limiar; abaixo disso o gasto
// extra e so "bonus" de queima, sem ajustar a meta.
// ---------------------------------------------------------------------------

export const LIMIAR_SUGESTAO_REPOSICAO_KCAL = 300;
export const PCT_REPOSICAO_GASTO_EXTRA = 0.6;

export interface SugestaoReposicao {
  gastoExtra: number;
  reposicao: number; // kcal a mais sugeridos
  metaAjustada: number; // kcalMetaBase + reposicao
  pisoAtingido: boolean; // teve que repor mais que 60% pra nao furar o piso de TMB
}

export function calcSugestaoReposicao(kcalMetaBase: number, gastoExtra: number, tmb: number | null): SugestaoReposicao | null {
  if (gastoExtra <= LIMIAR_SUGESTAO_REPOSICAO_KCAL) return null;
  let reposicao = Math.round(gastoExtra * PCT_REPOSICAO_GASTO_EXTRA);
  let pisoAtingido = false;
  if (tmb && kcalMetaBase + reposicao - gastoExtra < tmb) {
    reposicao = Math.round(tmb + gastoExtra - kcalMetaBase);
    pisoAtingido = true;
  }
  reposicao = Math.max(0, reposicao);
  return { gastoExtra, reposicao, metaAjustada: kcalMetaBase + reposicao, pisoAtingido };
}

// Meta de kcal "efetiva" do dia — kcalMetaBase ajustada pela reposicao
// quando o gasto extra passa do limiar. Usado tanto pela Home quanto pelo
// piso/teto de nutricao do RPG (useRPG.ts), pra nao punir quem comeu o
// tanto certo num dia de gasto alto.
export function kcalMetaEfetivaDoDia(kcalMetaBase: number, gastoExtra: number, tmb: number | null): number {
  const sugestao = calcSugestaoReposicao(kcalMetaBase, gastoExtra, tmb);
  return sugestao ? sugestao.metaAjustada : kcalMetaBase;
}
