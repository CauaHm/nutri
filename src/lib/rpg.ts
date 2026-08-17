// "O Sistema" — camada de progressao RPG. Calculo puro, zero React/I-O.
// Tudo aqui e determinístico e reaproveita os dados que ja existem
// (checks/mealLog/waters/treino/weightLogs) — nunca persiste nada sozinho,
// isso e responsabilidade de useRPG.ts. Ver AGENTS.md / plano da feature
// pras 4 regras de seguranca que este arquivo tem que respeitar sempre:
//  1) nunca dar XP de nutricao abaixo do piso seguro de kcal
//  2) nunca dar XP de "treino concluido" no 7o dia seguido sem descanso
//  3) penalidade nunca mexe em nivel/atributo — so ofensiva (ou protetor)
//  4) todo texto de penalidade trata pausa por doenca/lesao como certa

import { parseDate, formatDate, daysBetween } from "./dates";
import { totaisDoDia, type CheckEntry, type WaterEntry, type MealLog } from "./points";
import { calcGorduraNavy, type MedicaoEntry, type Sexo } from "./bodycomp";
import { minutosExtraNaJanela, type AtividadeExtra } from "./atividades";
import type { TreinoDia } from "./defaults";
import { SUB, GRN, CYAN, PURP, AMB } from "./theme";
import type { DiaMissoes, MissaoInstance } from "./missoes";

// ---------------------------------------------------------------------------
// Helpers de data locais (dates.ts fica intocado — ver AGENTS.md)
// ---------------------------------------------------------------------------

export function addDays(dateStr: string, delta: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

function clamp(min: number, max: number, v: number): number {
  return Math.min(max, Math.max(min, v));
}

// ---------------------------------------------------------------------------
// Nivel / XP
// ---------------------------------------------------------------------------

export function xpParaNivel(n: number): number {
  return Math.round(100 * Math.pow(n, 1.5));
}

export function nivelFromXP(xpTotal: number): { nivel: number; xpAtual: number; xpProximo: number } {
  const total = Math.max(0, Math.floor(xpTotal));
  let nivel = 0;
  while (xpParaNivel(nivel + 1) <= total) nivel++;
  const base = xpParaNivel(nivel);
  const proximo = xpParaNivel(nivel + 1);
  return { nivel, xpAtual: total - base, xpProximo: proximo - base };
}

// ---------------------------------------------------------------------------
// Ranks
// ---------------------------------------------------------------------------

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";

export interface RankDef {
  key: Rank;
  label: string;
  levelReq: number;
  color: string;
}

export const RANKS: RankDef[] = [
  { key: "E", label: "Rank E", levelReq: 1, color: SUB },
  { key: "D", label: "Rank D", levelReq: 8, color: GRN },
  { key: "C", label: "Rank C", levelReq: 18, color: CYAN },
  { key: "B", label: "Rank B", levelReq: 30, color: "#60a5fa" },
  { key: "A", label: "Rank A", levelReq: 45, color: PURP },
  { key: "S", label: "Rank S", levelReq: 65, color: AMB },
];

export function rankPorNivel(nivel: number): Rank {
  let atual: Rank = "E";
  for (const r of RANKS) if (nivel >= r.levelReq) atual = r.key;
  return atual;
}

function rankIndex(r: Rank): number {
  return RANKS.findIndex((x) => x.key === r);
}

// ---------------------------------------------------------------------------
// Ofensiva (streak) — sempre derivada, nunca um contador salvo separado.
// ---------------------------------------------------------------------------

function diaCumprido(m: Record<string, DiaMissoes>, date: string): boolean {
  return !!m[date]?.missoes.some((x) => x.cumprida);
}

export function calcOfensiva(m: Record<string, DiaMissoes>, today: string): number {
  let cursor = diaCumprido(m, today) ? today : addDays(today, -1);
  if (!diaCumprido(m, cursor)) return 0;
  let count = 0;
  const MAX_WALK = 3650; // rede de seguranca contra dado corrompido, nao um limite real
  while (count < MAX_WALK && diaCumprido(m, cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function calcOfensivaCompartilhada(mine: Record<string, DiaMissoes>, partner: Record<string, DiaMissoes>, today: string): number {
  const both = (date: string) => diaCumprido(mine, date) && diaCumprido(partner, date);
  let cursor = both(today) ? today : addDays(today, -1);
  if (!both(cursor)) return 0;
  let count = 0;
  const MAX_WALK = 3650;
  while (count < MAX_WALK && both(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// PRs (recordes pessoais) — nao sao persistidos em lugar nenhum hoje, sempre
// re-derivados a partir do weightLogs bruto.
// ---------------------------------------------------------------------------

export interface WeightLogLike {
  ex: string;
  data: string;
  kg: string;
  id?: number;
}

export function detectPRs<T extends WeightLogLike>(weightLogs: T[]): (T & { isPR: boolean })[] {
  const sorted = [...weightLogs].sort((a, b) => {
    const d = parseDate(a.data).getTime() - parseDate(b.data).getTime();
    if (d !== 0) return d;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  const maxPorExercicio = new Map<string, number>();
  return sorted.map((log) => {
    const kg = parseFloat(log.kg) || 0;
    const max = maxPorExercicio.get(log.ex) ?? -Infinity;
    const isPR = kg > max;
    if (kg > max) maxPorExercicio.set(log.ex, kg);
    return { ...log, isPR };
  });
}

// ---------------------------------------------------------------------------
// Saturacao logaritmica + decaimento por inatividade
// ---------------------------------------------------------------------------

export function logSaturate(value: number, cap: number): number {
  if (value <= 0) return 1;
  return clamp(1, 99, Math.round(1 + (98 * Math.log(1 + value)) / Math.log(1 + cap)));
}

export function decayPontos(diasSemAtividadeConsecutivos: number): number {
  return Math.min(8, Math.floor(diasSemAtividadeConsecutivos / 7));
}

// ---------------------------------------------------------------------------
// Atributos — FOR/RES/DIS/NUT/VIT. Cada um: conta bruta numa janela de 30
// dias corridos -> logSaturate(raw, cap) -> subtrai decaimento por
// inatividade -> clamp [1,99]. Os caps abaixo sao ponto de partida, ajustaveis
// (comentado explicitamente porque nao ha "valor certo" objetivo aqui).
// ---------------------------------------------------------------------------

export interface Atributos {
  FOR: number;
  RES: number;
  DIS: number;
  NUT: number;
  VIT: number;
}

// Tendencia de %gordura entre a 1a e a ultima medicao dentro de uma janela de
// 90 dias — so soma pontos se melhorou ou manteve, NUNCA subtrai se piorou
// (regra: "nunca punir, so deixar de premiar").
export function calcBonusTendenciaGordura(historico: MedicaoEntry[], sexo: Sexo, altura: number | null, today: string): number {
  if (!historico.length) return 0;
  const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));
  const dentro90 = historico.filter((h) => {
    const d = daysBetween(h.date, today);
    return d >= 0 && d <= 90;
  });
  if (dentro90.length < 2) return 0;
  const ordenado = [...dentro90].sort((a, b) => a.id - b.id);
  const primeiro = ordenado[0];
  const ultimo = ordenado[ordenado.length - 1];
  const pctDe = (h: MedicaoEntry): number | null =>
    (h.gorduraMedida !== "" && h.gorduraMedida != null ? num(h.gorduraMedida) : null) ??
    calcGorduraNavy({ sexo, altura, cintura: num(h.cintura), pescoco: num(h.pescoco), quadril: num(h.quadril) });
  const pctPrimeiro = pctDe(primeiro);
  const pctUltimo = pctDe(ultimo);
  if (pctPrimeiro === null || pctUltimo === null) return 0;
  return pctUltimo <= pctPrimeiro ? 6 : 0; // piorou -> 0, nunca negativo
}

export interface CalcAtributosInput {
  today: string;
  checks: CheckEntry[];
  waters: WaterEntry[];
  mealLog: MealLog;
  treino: TreinoDia[] | null;
  weightLogs: WeightLogLike[];
  kcalMeta: number;
  waterMeta: number;
  proteinaMeta: number;
  tmb: number | null;
  ofensiva: number;
  bodyCompHistorico: MedicaoEntry[];
  sexo: Sexo;
  altura: number | null;
  atividadesExtras: AtividadeExtra[];
}

// Caps de saturacao (30 dias de janela) — ponto de partida, ajustavel:
const CAP_FOR = 30;
const CAP_RES = 30;
const CAP_DIS = 45;
const CAP_NUT = 60;
const CAP_VIT = 60;

// Minutos de atividade extra viram "sessoes equivalentes" (1 unidade a cada
// 15min) antes de somar no RES — sem isso, minutos brutos (facilmente
// 300-500+ em 30 dias) saturariam o atributo sozinhos, fora de proporcao
// com os outros inputs (que sao contagem de dias, 0-30). Divisor ajustavel.
const MIN_POR_UNIDADE_RES = 15;

export function calcAtributos(input: CalcAtributosInput): Atributos {
  const { today, checks, waters, mealLog, treino, weightLogs, kcalMeta, waterMeta, proteinaMeta, tmb, ofensiva, bodyCompHistorico, sexo, altura, atividadesExtras } = input;

  // janela dos ultimos 30 dias corridos, incluindo hoje
  const janela: string[] = [];
  for (let i = 0; i < 30; i++) janela.push(addDays(today, -i));
  const janelaSet = new Set(janela);

  // Maps construidos uma unica vez — nunca .find() dentro do loop de 30 dias
  // (esse e exatamente o anti-padrao que calcPontos tem hoje em points.ts).
  const checksPorData = new Map(checks.map((c) => [c.date, c] as const));
  const watersPorData = new Map(waters.map((w) => [w.date, w] as const));

  const pisoNutricao = Math.max(tmb || 0, kcalMeta * 0.9);
  const tetoNutricao = kcalMeta * 1.1;

  let trainingDays30d = 0;
  let completoDays30d = 0;
  let diasComRegistro30d = 0;
  let diasAguaAlvo30d = 0;
  let diasKcalNaFaixa30d = 0;
  let diasProteinaAlvo30d = 0;
  let diasSemAtividadeConsecutivos = 0;
  let aindaContandoInatividade = true;

  for (const date of janela) {
    const check = checksPorData.get(date);
    const treinou = !!check && check.status !== "none";
    if (treinou) trainingDays30d++;
    if (check?.status === "completo") completoDays30d++;

    const water = watersPorData.get(date);
    const bateuAgua = !!water && water.liters >= waterMeta;
    if (bateuAgua) diasAguaAlvo30d++;

    const totais = totaisDoDia(mealLog, date);
    const kcalNaFaixa = totais.kcal > 0 && totais.kcal >= pisoNutricao && totais.kcal <= tetoNutricao;
    if (kcalNaFaixa) diasKcalNaFaixa30d++;
    if (totais.proteina >= proteinaMeta && proteinaMeta > 0) diasProteinaAlvo30d++;

    const temRegistro = treinou || bateuAgua || totais.kcal > 0;
    if (temRegistro) diasComRegistro30d++;

    if (aindaContandoInatividade) {
      if (temRegistro) aindaContandoInatividade = false;
      else diasSemAtividadeConsecutivos++;
    }
  }

  // dias de cardio programados vs efetivamente batidos, dentro da janela (RES)
  const diasCardioProgramados = new Set((treino || []).filter((d) => d.isCardio).map((d) => d.dia));
  let scheduledCardioDaysHit30d = 0;
  if (diasCardioProgramados.size > 0) {
    const WEEKDAY_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    for (const date of janela) {
      const diaSemana = WEEKDAY_PT[parseDate(date).getDay()];
      if (!diasCardioProgramados.has(diaSemana)) continue;
      const check = checksPorData.get(date);
      if (check && check.status !== "none") scheduledCardioDaysHit30d++;
    }
  }

  // PRs dentro da janela de 30 dias (FOR)
  const prsRecentes = detectPRs(weightLogs).filter((w) => w.isPR && janelaSet.has(w.data)).length;

  // tendencia de %gordura (VIT) — nunca subtrai
  const bonusTendenciaGordura = calcBonusTendenciaGordura(bodyCompHistorico, sexo, altura, today);

  const minutosExtra30d = minutosExtraNaJanela(atividadesExtras, janela);

  const forRaw = prsRecentes * 2 + trainingDays30d;
  const resRaw = completoDays30d + scheduledCardioDaysHit30d + Math.floor(minutosExtra30d / MIN_POR_UNIDADE_RES);
  const disRaw = ofensiva + diasComRegistro30d;
  const nutRaw = diasKcalNaFaixa30d + diasProteinaAlvo30d;
  const vitRaw = diasAguaAlvo30d * 2 + bonusTendenciaGordura;

  const decay = decayPontos(diasSemAtividadeConsecutivos);

  return {
    FOR: clamp(1, 99, logSaturate(forRaw, CAP_FOR) - decay),
    RES: clamp(1, 99, logSaturate(resRaw, CAP_RES) - decay),
    DIS: clamp(1, 99, logSaturate(disRaw, CAP_DIS) - decay),
    NUT: clamp(1, 99, logSaturate(nutRaw, CAP_NUT) - decay),
    VIT: clamp(1, 99, logSaturate(vitRaw, CAP_VIT) - decay),
  };
}

// ---------------------------------------------------------------------------
// XP de um dia (soma das missoes cumpridas daquele dia)
// ---------------------------------------------------------------------------

export function calcXPDoDia(dia: DiaMissoes | undefined): number {
  if (!dia) return 0;
  return dia.missoes.filter((m) => m.cumprida).reduce((s, m) => s + m.xp, 0);
}

// ---------------------------------------------------------------------------
// Titulos — condicoes de desbloqueio expostas como texto simples (a galeria
// mostra bloqueados em silhueta + essa descricao, curiosidade > misterio
// total).
// ---------------------------------------------------------------------------

export type TituloKey = "madrugador" | "inquebravel" | "recomposto" | "levantador" | "constante" | "duplista";

export interface TituloDef {
  key: TituloKey;
  nome: string;
  descricao: string;
}

export const TITULOS: TituloDef[] = [
  { key: "madrugador", nome: "Madrugador", descricao: "Treine antes das 8h em 10 dias diferentes." },
  { key: "inquebravel", nome: "Inquebrável", descricao: "Mantenha a ofensiva viva por 30 dias seguidos." },
  { key: "recomposto", nome: "Recomposto", descricao: "Melhore (ou mantenha) sua composição corporal numa janela de 90 dias." },
  { key: "levantador", nome: "Levantador", descricao: "Bata 5 recordes pessoais de carga." },
  { key: "constante", nome: "Constante", descricao: "Cumpra pelo menos 1 missão em 60 dias — não precisam ser seguidos." },
  { key: "duplista", nome: "Duplista", descricao: "Mantenha uma ofensiva compartilhada com seu parceiro por 14 dias seguidos." },
];

export interface CalcTitulosInput {
  treinoTimestamps: Record<string, number>;
  ofensiva: number;
  ofensivaCompartilhada: number;
  temParceiro: boolean;
  prsTotais: number;
  missoesCumpridas: Record<string, DiaMissoes>;
  bonusTendenciaGordura: number;
}

export function calcTitulos(input: CalcTitulosInput): TituloKey[] {
  const { treinoTimestamps, ofensiva, ofensivaCompartilhada, temParceiro, prsTotais, missoesCumpridas, bonusTendenciaGordura } = input;
  const desbloqueados: TituloKey[] = [];

  const madrugadas = Object.values(treinoTimestamps).filter((ts) => new Date(ts).getHours() < 8).length;
  if (madrugadas >= 10) desbloqueados.push("madrugador");

  if (ofensiva >= 30) desbloqueados.push("inquebravel");

  if (bonusTendenciaGordura > 0) desbloqueados.push("recomposto");

  if (prsTotais >= 5) desbloqueados.push("levantador");

  const diasComMissao = Object.values(missoesCumpridas).filter((d) => d.missoes.some((m) => m.cumprida)).length;
  if (diasComMissao >= 60) desbloqueados.push("constante");

  if (temParceiro && ofensivaCompartilhada >= 14) desbloqueados.push("duplista");

  return desbloqueados;
}

// ---------------------------------------------------------------------------
// Teste de ascensao — promocao de rank e historico real (o jogador precisa
// "provar" o rank numa janela de 7 dias), nunca um threshold automatico.
// ---------------------------------------------------------------------------

export interface CriterioAscensao {
  tipo: "missoes_semana" | "sem_dia_zero";
  label: string;
  alvo: number;
}

export interface TesteAscensao {
  rankAlvo: Rank;
  iniciadoEm: string;
  expiraEm: string;
  criterios: CriterioAscensao[];
  resultado: "pendente" | "sucesso" | "falha";
}

export function gerarTesteAscensao(rankAlvo: Rank, hoje: string): TesteAscensao {
  return {
    rankAlvo,
    iniciadoEm: hoje,
    expiraEm: addDays(hoje, 7),
    criterios: [
      { tipo: "missoes_semana", label: "Cumprir pelo menos 5 missões nesta semana", alvo: 5 },
      { tipo: "sem_dia_zero", label: "Não deixar nenhum dia zerado nesta semana", alvo: 7 },
    ],
    resultado: "pendente",
  };
}

export function avaliarTesteAscensao(teste: TesteAscensao, missoesCumpridas: Record<string, DiaMissoes>): "sucesso" | "falha" {
  const dias: string[] = [];
  let cursor = teste.iniciadoEm;
  let guard = 0;
  while (cursor !== teste.expiraEm && guard < 14) {
    dias.push(cursor);
    cursor = addDays(cursor, 1);
    guard++;
  }
  let totalMissoes = 0;
  let diasZerados = 0;
  for (const date of dias) {
    const dia = missoesCumpridas[date];
    const cumpridas = dia ? dia.missoes.filter((m) => m.cumprida).length : 0;
    totalMissoes += cumpridas;
    if (cumpridas === 0) diasZerados++;
  }
  const missoesCriterio = teste.criterios.find((c) => c.tipo === "missoes_semana");
  const semZeroCriterio = teste.criterios.find((c) => c.tipo === "sem_dia_zero");
  const bateuMissoes = !missoesCriterio || totalMissoes >= missoesCriterio.alvo;
  const bateuSemZero = !semZeroCriterio || diasZerados === 0;
  return bateuMissoes && bateuSemZero ? "sucesso" : "falha";
}

export function rankMaisAltoElegivel(nivel: number, atual: Rank): Rank {
  const elegivel = rankPorNivel(nivel);
  return rankIndex(elegivel) > rankIndex(atual) ? elegivel : atual;
}

export { rankIndex };

// ---------------------------------------------------------------------------
// Checkpoint de XP — xpTotal e um cache. Cada carregamento so varre o mes
// corrente a partir de missoesCumpridas; tudo antes fica dobrado dentro de
// xpCheckpoint, avancado um mes por vez (bounded <=31 dias por mes dobrado).
// ---------------------------------------------------------------------------

export interface XPCheckpoint {
  ateData: string; // "DD/MM/YYYY" do 1o dia do mes ainda nao dobrado
  xpAcumulado: number;
}

function primeiroDiaDoMes(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function primeiroDiaDoProximoMes(dateStr: string): string {
  const d = parseDate(dateStr);
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
}

function diasNoMes(dateStr: string): number {
  const d = parseDate(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function foldCheckpoint(checkpoint: XPCheckpoint, missoesCumpridas: Record<string, DiaMissoes>, today: string): XPCheckpoint {
  let ateData = checkpoint.ateData;
  let xpAcumulado = checkpoint.xpAcumulado;
  const mesAtual = primeiroDiaDoMes(today);
  let guard = 0;
  while (ateData !== mesAtual && guard < 240) {
    guard++;
    const dias = diasNoMes(ateData);
    const base = parseDate(ateData);
    for (let dia = 1; dia <= dias; dia++) {
      const ds = formatDate(new Date(base.getFullYear(), base.getMonth(), dia));
      xpAcumulado += calcXPDoDia(missoesCumpridas[ds]);
    }
    ateData = primeiroDiaDoProximoMes(ateData);
  }
  return { ateData, xpAcumulado };
}

export function xpDoMesCorrente(missoesCumpridas: Record<string, DiaMissoes>, mesAtual: string, today: string): number {
  let soma = 0;
  let cursor = mesAtual;
  let guard = 0;
  const fim = addDays(today, 1);
  while (cursor !== fim && guard < 31) {
    soma += calcXPDoDia(missoesCumpridas[cursor]);
    cursor = addDays(cursor, 1);
    guard++;
  }
  return soma;
}

export function calcXPTotal(checkpoint: XPCheckpoint, missoesCumpridas: Record<string, DiaMissoes>, today: string): { checkpoint: XPCheckpoint; xpTotal: number } {
  const folded = foldCheckpoint(checkpoint, missoesCumpridas, today);
  const doMes = xpDoMesCorrente(missoesCumpridas, folded.ateData, today);
  return { checkpoint: folded, xpTotal: folded.xpAcumulado + doMes };
}

export function checkpointInicial(today: string): XPCheckpoint {
  return { ateData: primeiroDiaDoMes(today), xpAcumulado: 0 };
}

// Reexport de tipo pra quem so importa de rpg.ts (conveniencia)
export type { DiaMissoes, MissaoInstance };
