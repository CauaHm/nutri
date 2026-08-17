// Geracao deterministica de missoes diarias/raid semanal — zero
// Math.random() neste arquivo. Mesmo seed (data + userId, ou data + par de
// ids ordenados pro raid) sempre produz o mesmo resultado, em qualquer
// aba/aparelho, sem precisar sincronizar nada com o servidor.

import { parseDate, formatDate } from "./dates";
import type { CheckEntry } from "./points";

function addDaysLocal(dateStr: string, delta: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDate(d);
}

// xmur3-like string hash -> seed de 32 bits
function seedFromString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// mulberry32 — PRNG determinístico rapido, suficiente pra variar texto/rolar
// bonus sem precisar de nada criptografico.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { seedFromString, mulberry32 };

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MissaoTipo = "treino" | "recuperacao" | "nutricao" | "agua" | "bonus";

export interface MissaoInstance {
  id: string; // `${date}_${tipo}` (ou sufixo especial pra marcadores: _protetor / _pr_bonus / _raid_bonus)
  tipo: MissaoTipo;
  titulo: string;
  descricao: string;
  xp: number;
  cumprida: boolean;
  cumpridaEm?: number;
}

export interface DiaMissoes {
  date: string;
  missoes: MissaoInstance[];
  redencaoAtiva?: boolean;
}

// XP base por tipo de missao — ponto de partida, ajustavel.
const BASE_XP = { treino: 40, recuperacao: 30, nutricao: 30, agua: 20, bonus: 25 } as const;

const VARIANTES_TREINO = [
  "Marque o treino de hoje como completo ou parcial.",
  "Hoje é dia de treinar — registre completo ou parcial ao terminar.",
  "Cumpra o treino do dia e registre o resultado.",
];
const VARIANTES_NUTRICAO = [
  "Fique dentro da faixa segura de calorias e bata sua meta de proteína.",
  "Coma dentro da faixa recomendada hoje e não deixe a proteína de lado.",
  "Alimente-se dentro do seguro hoje, com proteína na meta.",
];
const VARIANTES_AGUA = [
  "Bata sua meta de água do dia.",
  "Chegue na sua meta de hidratação hoje.",
  "Não esqueça da água — bata a meta de hoje.",
];

// ---------------------------------------------------------------------------
// Geracao do dia
// ---------------------------------------------------------------------------

export interface MissoesCtx {
  diasConsecutivosTreino: number; // diasTreinoConsecutivos(checks, date)
  redencaoAtiva: boolean; // dia seguinte a um dia zerado (sem protetor disponivel)
}

// Regra de seguranca #2: no 7o dia seguido de treino completo/parcial, a
// missao de treino vira Recuperacao (descanso + agua + proteina) em vez de
// pedir mais um dia de treino. Cumprir a Recuperacao da XP normal.
export function gerarMissoesDoDia(date: string, userId: string, ctx: MissoesCtx): DiaMissoes {
  const rand = mulberry32(seedFromString(`${userId}:${date}`));
  const treinoVirouRecuperacao = ctx.diasConsecutivosTreino >= 6;
  const multiplicador = ctx.redencaoAtiva ? 2 : 1;

  // ordem fixa de chamadas do PRNG: variante de treino/recuperacao, variante
  // de nutricao, variante de agua, rolagem de missao bonus (20%).
  const varianteTreinoIdx = Math.floor(rand() * VARIANTES_TREINO.length);
  const varianteNutricaoIdx = Math.floor(rand() * VARIANTES_NUTRICAO.length);
  const varianteAguaIdx = Math.floor(rand() * VARIANTES_AGUA.length);
  const bonusRoll = rand();
  const temBonus = bonusRoll < 0.2;

  const missoes: MissaoInstance[] = [];

  if (treinoVirouRecuperacao) {
    missoes.push({
      id: `${date}_recuperacao`,
      tipo: "recuperacao",
      titulo: "Missão de Recuperação",
      descricao: "6 dias seguidos de treino já é muita coisa — hoje descanse, beba sua água e bata a meta de proteína. Recuperar é parte do treino.",
      xp: BASE_XP.recuperacao * multiplicador,
      cumprida: false,
    });
  } else {
    missoes.push({
      id: `${date}_treino`,
      tipo: "treino",
      titulo: "Cumprir o treino do dia",
      descricao: VARIANTES_TREINO[varianteTreinoIdx],
      xp: BASE_XP.treino * multiplicador,
      cumprida: false,
    });
  }

  missoes.push({
    id: `${date}_nutricao`,
    tipo: "nutricao",
    titulo: "Nutrição na faixa",
    descricao: VARIANTES_NUTRICAO[varianteNutricaoIdx],
    xp: BASE_XP.nutricao * multiplicador,
    cumprida: false,
  });

  missoes.push({
    id: `${date}_agua`,
    tipo: "agua",
    titulo: "Hidratação",
    descricao: VARIANTES_AGUA[varianteAguaIdx],
    xp: BASE_XP.agua * multiplicador,
    cumprida: false,
  });

  if (temBonus) {
    missoes.push({
      id: `${date}_bonus`,
      tipo: "bonus",
      titulo: "Missão Bônus: Dia Completo",
      descricao: "Cumpra todas as outras missões de hoje pra ganhar esse extra.",
      xp: BASE_XP.bonus * multiplicador,
      cumprida: false,
    });
  }

  return { date, missoes, redencaoAtiva: ctx.redencaoAtiva || undefined };
}

// ---------------------------------------------------------------------------
// Regra de seguranca #2 — dias consecutivos de treino (completo ou parcial),
// andando checks pra tras a partir do dia ANTES de `antesDe`. Map construido
// uma unica vez — nunca .find() dentro do loop (anti-padrao que calcPontos
// tem hoje em points.ts).
// ---------------------------------------------------------------------------

export function diasTreinoConsecutivos(checks: CheckEntry[], antesDe: string): number {
  const porData = new Map(checks.map((c) => [c.date, c] as const));
  let cursor = addDaysLocal(antesDe, -1);
  let count = 0;
  const MAX_WALK = 3650;
  while (count < MAX_WALK) {
    const c = porData.get(cursor);
    if (!c || c.status === "none") break;
    count++;
    cursor = addDaysLocal(cursor, -1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Raid semanal cooperativa — so existe quando ha parceiro. Seed inclui os
// dois ids ordenados + a semana, entao os dois clientes (independentes)
// derivam exatamente o mesmo raid sem precisar sincronizar nada.
// ---------------------------------------------------------------------------

export interface RaidSemanal {
  weekStart: string;
  nome: string;
  descricao: string;
  tipo: "missoes_combinadas";
  alvo: number;
  recompensaXp: number;
}

export interface RaidCtx {
  temParceiro: boolean;
}

const NOMES_RAID = ["Investida Conjunta", "Marcha da Dupla", "Assalto Semanal", "Operação Sincronia", "Avanço Coordenado"];

export function gerarRaidDaSemana(weekStart: string, ids: { userId: string; outroId: string | null }, ctx: RaidCtx): RaidSemanal | null {
  if (!ids.outroId || !ctx.temParceiro) return null;
  const seedIds = [ids.userId, ids.outroId].sort().join("_");
  const rand = mulberry32(seedFromString(`${seedIds}:${weekStart}`));
  const nomeIdx = Math.floor(rand() * NOMES_RAID.length);
  const passoIdx = Math.floor(rand() * 5); // 0-4
  const alvo = 10 + passoIdx * 2; // 10-18, combinado dos dois parceiros
  return {
    weekStart,
    nome: NOMES_RAID[nomeIdx],
    descricao: `Juntos, cumpram ${alvo} missões diárias essa semana (soma dos dois) pra vencer o raid.`,
    tipo: "missoes_combinadas",
    alvo,
    recompensaXp: 150,
  };
}
