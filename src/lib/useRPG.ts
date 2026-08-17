// Hook do "Sistema" — orquestra estado persistido (${userId}_rpg no KV) +
// derivacoes ao vivo (nivel/atributos/ofensiva sao sempre calculados na
// hora, nunca guardados). Ver rpg.ts/missoes.ts pro calculo puro; este
// arquivo so faz I/O (kvGet/kvSet) + React (useState/useEffect/useMemo) em
// cima deles.
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { kvGet, kvSet } from "./clientStorage";
import { todayStr, getWeekStart, daysBetween } from "./dates";
import { totaisDoDia, type CheckEntry, type WaterEntry, type MealLog } from "./points";
import { calcTMB, type MedicaoEntry, type Sexo } from "./bodycomp";
import type { TreinoDia } from "./defaults";
import type { User } from "./types";
import {
  addDays, calcOfensiva, calcOfensivaCompartilhada, calcAtributos, calcXPTotal, calcXPDoDia,
  calcTitulos, calcBonusTendenciaGordura, detectPRs, nivelFromXP, rankPorNivel, rankMaisAltoElegivel,
  gerarTesteAscensao, avaliarTesteAscensao, checkpointInicial,
  type Atributos, type Rank, type TesteAscensao, type XPCheckpoint, type TituloKey, type WeightLogLike,
} from "./rpg";
import { gerarMissoesDoDia, diasTreinoConsecutivos, gerarRaidDaSemana, type DiaMissoes, type MissaoInstance, type RaidSemanal } from "./missoes";

const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));

// ---------------------------------------------------------------------------
// Estado persistido
// ---------------------------------------------------------------------------

export interface ResultadoAscensao {
  rankAlvo: Rank;
  resultado: "sucesso" | "falha";
  data: string;
}

export interface RPGData {
  xpCheckpoint: XPCheckpoint;
  titulosDesbloqueados: TituloKey[];
  rankAtual: Rank;
  missoesCumpridas: Record<string, DiaMissoes>;
  testeAscensao: TesteAscensao | null;
  treinoTimestamps: Record<string, number>;
  raidsConcluidos: Record<string, boolean>;
  protetorDisponivel: boolean;
  diasLimposSeguidosProtetor: number;
  ultimoDiaProcessado: string;
  ultimoResultadoAscensao: ResultadoAscensao | null;
}

function rpgDefault(today: string): RPGData {
  return {
    xpCheckpoint: checkpointInicial(today),
    titulosDesbloqueados: [],
    rankAtual: "E",
    missoesCumpridas: {},
    testeAscensao: null,
    treinoTimestamps: {},
    raidsConcluidos: {},
    protetorDisponivel: true,
    diasLimposSeguidosProtetor: 0,
    ultimoDiaProcessado: today,
    ultimoResultadoAscensao: null,
  };
}

// ---------------------------------------------------------------------------
// Passo puro de evolucao — dado o estado anterior + o contexto de hoje,
// devolve o proximo estado. Testavel isoladamente (sem React/rede).
// ---------------------------------------------------------------------------

export interface StepRPGCtx {
  today: string;
  now: number;
  userId: string;
  outroId: string | null;
  temParceiro: boolean;
  checks: CheckEntry[];
  mealLog: MealLog;
  waters: WaterEntry[];
  treino: TreinoDia[] | null;
  weightLogs: WeightLogLike[];
  user: { kcalMeta: number; waterMeta: number; proteinaMeta: number; sexo: Sexo };
  tmb: number | null;
  bodyCompHistorico: MedicaoEntry[];
  altura: number | null;
  partnerMissoesCumpridas: Record<string, DiaMissoes> | null;
}

function isMarcador(id: string): boolean {
  return id.endsWith("_protetor") || id.endsWith("_pr_bonus") || id.endsWith("_raid_bonus");
}

// Regra de seguranca #3: o unico efeito de um dia zerado e perder a ofensiva
// — ou consumir o protetor (silenciosamente, sem redencao) se disponivel.
// O protetor "conta" o dia como cumprido pra fins de ofensiva via um
// marcador de XP 0 (mantem calcOfensiva 100% igual ao algoritmo dado).
function processarTransicoesDeDia(prev: RPGData, today: string): { missoesCumpridas: Record<string, DiaMissoes>; protetorDisponivel: boolean; diasLimposSeguidosProtetor: number; ultimoDiaProcessado: string; redencaoParaHoje: boolean } {
  let missoesCumpridas = prev.missoesCumpridas;
  let protetorDisponivel = prev.protetorDisponivel;
  let diasLimpos = prev.diasLimposSeguidosProtetor;
  let ultimoDiaProcessado = prev.ultimoDiaProcessado;
  let redencaoParaHoje = false;

  let guard = 0;
  const CATCHUP_CAP = 60; // conta afastada por meses: nao reproduz protetor/redencao dia a dia alem disso
  while (ultimoDiaProcessado !== today && guard < CATCHUP_CAP) {
    guard++;
    const diaAvaliado = ultimoDiaProcessado;
    const registro = missoesCumpridas[diaAvaliado];
    const teveAlgumaCumprida = !!registro && registro.missoes.some((m) => m.cumprida);
    const teveDiaRealLimpo = !!registro && registro.missoes.some((m) => m.cumprida && !isMarcador(m.id));

    let redencaoParaProximo = false;
    if (!teveAlgumaCumprida) {
      if (protetorDisponivel) {
        const marcador: MissaoInstance = {
          id: `${diaAvaliado}_protetor`,
          tipo: "bonus",
          titulo: "Protetor de Ofensiva",
          descricao: "Seu protetor absorveu esse dia — a ofensiva continua viva. Nenhum XP extra, só a garantia. Pausar quando precisa não é derrota.",
          xp: 0,
          cumprida: true,
        };
        missoesCumpridas = { ...missoesCumpridas, [diaAvaliado]: { date: diaAvaliado, missoes: [...(registro?.missoes || []), marcador] } };
        protetorDisponivel = false;
        diasLimpos = 0;
      } else {
        redencaoParaProximo = true;
        diasLimpos = 0;
      }
    } else if (teveDiaRealLimpo) {
      diasLimpos++;
      if (!protetorDisponivel && diasLimpos >= 14) {
        protetorDisponivel = true;
        diasLimpos = 0;
      }
    }

    ultimoDiaProcessado = addDays(ultimoDiaProcessado, 1);
    if (ultimoDiaProcessado === today) redencaoParaHoje = redencaoParaProximo;
  }

  if (ultimoDiaProcessado !== today) {
    // conta dormente por muito tempo — nao reconstroi protetor/redencao pra
    // todo o hiato (nao seria util nem justo), so alinha o cursor.
    ultimoDiaProcessado = today;
  }

  return { missoesCumpridas, protetorDisponivel, diasLimposSeguidosProtetor: diasLimpos, ultimoDiaProcessado, redencaoParaHoje };
}

function garantirMissoesDoDia(missoesCumpridas: Record<string, DiaMissoes>, ctx: { today: string; userId: string; checks: CheckEntry[]; redencaoAtiva: boolean }): Record<string, DiaMissoes> {
  if (missoesCumpridas[ctx.today]) return missoesCumpridas;
  const diasConsecutivosTreino = diasTreinoConsecutivos(ctx.checks, ctx.today);
  const dia = gerarMissoesDoDia(ctx.today, ctx.userId, { diasConsecutivosTreino, redencaoAtiva: ctx.redencaoAtiva });
  return { ...missoesCumpridas, [ctx.today]: dia };
}

// Regra de seguranca #1: nutricao so cumpre se kcal do dia estiver dentro da
// faixa segura [max(TMB, kcalMeta*0.9), kcalMeta*1.1] E proteina na meta.
// Abaixo do piso -> nunca cumpre (0 XP), sem excecao.
function derivarCumprimento(missoesCumpridas: Record<string, DiaMissoes>, ctx: StepRPGCtx): Record<string, DiaMissoes> {
  const dia = missoesCumpridas[ctx.today];
  if (!dia) return missoesCumpridas;

  const totais = totaisDoDia(ctx.mealLog, ctx.today);
  const piso = Math.max(ctx.tmb || 0, ctx.user.kcalMeta * 0.9);
  const teto = ctx.user.kcalMeta * 1.1;
  const nutricaoOk = totais.kcal > 0 && totais.kcal >= piso && totais.kcal <= teto && totais.proteina >= ctx.user.proteinaMeta;

  const waterEntry = ctx.waters.find((w) => w.date === ctx.today);
  const aguaOk = !!waterEntry && waterEntry.liters >= ctx.user.waterMeta;

  const checkHoje = ctx.checks.find((c) => c.date === ctx.today);
  const treinouOk = !!checkHoje && checkHoje.status !== "none";
  const descansouOk = !checkHoje || checkHoje.status === "none";
  const recuperacaoOk = descansouOk && aguaOk && totais.proteina >= ctx.user.proteinaMeta;

  const cumpreTipo = (tipo: MissaoInstance["tipo"]): boolean => {
    if (tipo === "treino") return treinouOk;
    if (tipo === "recuperacao") return recuperacaoOk;
    if (tipo === "nutricao") return nutricaoOk;
    if (tipo === "agua") return aguaOk;
    return false;
  };

  let mudou = false;
  const novasMissoes = dia.missoes.map((m) => {
    if (m.cumprida) return m; // nunca revoga, mesmo se o dado for editado pra baixo depois
    let deveCumprir = false;
    if (m.tipo === "bonus" && !isMarcador(m.id)) {
      // missao bonus "dia completo": cumpre quando as demais missoes do dia estao cumpridas
      deveCumprir = dia.missoes.filter((x) => x.tipo !== "bonus").every((x) => x.cumprida || cumpreTipo(x.tipo));
    } else {
      deveCumprir = cumpreTipo(m.tipo);
    }
    if (deveCumprir) {
      mudou = true;
      return { ...m, cumprida: true, cumpridaEm: ctx.now };
    }
    return m;
  });

  if (!mudou) return missoesCumpridas;
  return { ...missoesCumpridas, [ctx.today]: { ...dia, missoes: novasMissoes } };
}

function injetarBonusPR(missoesCumpridas: Record<string, DiaMissoes>, ctx: StepRPGCtx): Record<string, DiaMissoes> {
  const dia = missoesCumpridas[ctx.today];
  const idMarcador = `${ctx.today}_pr_bonus`;
  if (dia?.missoes.some((m) => m.id === idMarcador)) return missoesCumpridas;
  const prsHoje = detectPRs(ctx.weightLogs).filter((w) => w.isPR && w.data === ctx.today);
  if (!prsHoje.length) return missoesCumpridas;
  const marcador: MissaoInstance = {
    id: idMarcador,
    tipo: "bonus",
    titulo: "Recorde Pessoal!",
    descricao: `Novo PR em ${prsHoje[0].ex} — bônus de XP.`,
    xp: 100,
    cumprida: true,
    cumpridaEm: ctx.now,
  };
  const base = dia || { date: ctx.today, missoes: [] };
  return { ...missoesCumpridas, [ctx.today]: { ...base, missoes: [...base.missoes, marcador] } };
}

function calcularProgressoRaid(mine: Record<string, DiaMissoes>, partner: Record<string, DiaMissoes> | null, weekStart: string): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    total += mine[date]?.missoes.filter((m) => m.cumprida && !isMarcador(m.id)).length || 0;
    if (partner) total += partner[date]?.missoes.filter((m) => m.cumprida && !isMarcador(m.id)).length || 0;
  }
  return total;
}

function injetarBonusRaid(missoesCumpridas: Record<string, DiaMissoes>, ctx: StepRPGCtx, weekStart: string, recompensaXp: number): Record<string, DiaMissoes> {
  const dia = missoesCumpridas[ctx.today];
  const idMarcador = `${weekStart}_raid_bonus`;
  if (dia?.missoes.some((m) => m.id === idMarcador)) return missoesCumpridas;
  const marcador: MissaoInstance = {
    id: idMarcador,
    tipo: "bonus",
    titulo: "Raid da Semana Concluído",
    descricao: "Vocês bateram a meta combinada da semana — bônus pros dois.",
    xp: recompensaXp,
    cumprida: true,
    cumpridaEm: ctx.now,
  };
  const base = dia || { date: ctx.today, missoes: [] };
  return { ...missoesCumpridas, [ctx.today]: { ...base, missoes: [...base.missoes, marcador] } };
}

export function stepRPG(prev: RPGData, ctx: StepRPGCtx): RPGData {
  const { today } = ctx;

  const t1 = processarTransicoesDeDia(prev, today);
  const redencaoAtiva = t1.redencaoParaHoje || !!t1.missoesCumpridas[today]?.redencaoAtiva;
  const m2 = garantirMissoesDoDia(t1.missoesCumpridas, { today, userId: ctx.userId, checks: ctx.checks, redencaoAtiva });
  const m3 = derivarCumprimento(m2, ctx);
  const m4 = injetarBonusPR(m3, ctx);

  const weekStart = getWeekStart(today);
  const raid = gerarRaidDaSemana(weekStart, { userId: ctx.userId, outroId: ctx.outroId }, { temParceiro: ctx.temParceiro });
  let m5 = m4;
  let raidsConcluidos = prev.raidsConcluidos;
  if (raid && !raidsConcluidos[weekStart]) {
    const progresso = calcularProgressoRaid(m4, ctx.partnerMissoesCumpridas, weekStart);
    if (progresso >= raid.alvo) {
      m5 = injetarBonusRaid(m4, ctx, weekStart, raid.recompensaXp);
      raidsConcluidos = { ...raidsConcluidos, [weekStart]: true };
    }
  }

  const { checkpoint: xpCheckpoint, xpTotal } = calcXPTotal(prev.xpCheckpoint, m5, today);
  const { nivel } = nivelFromXP(xpTotal);
  const rankElegivel = rankPorNivel(nivel);

  let rankAtual = prev.rankAtual;
  let testeAscensao = prev.testeAscensao;
  let ultimoResultadoAscensao = prev.ultimoResultadoAscensao;

  if (testeAscensao && daysBetween(testeAscensao.expiraEm, today) >= 0) {
    const resultado = avaliarTesteAscensao(testeAscensao, m5);
    if (resultado === "sucesso") rankAtual = testeAscensao.rankAlvo;
    ultimoResultadoAscensao = { rankAlvo: testeAscensao.rankAlvo, resultado, data: today };
    testeAscensao = null;
  }

  if (!testeAscensao) {
    const alvoDesejado = rankMaisAltoElegivel(nivel, rankAtual);
    if (alvoDesejado !== rankAtual && rankElegivel === alvoDesejado) {
      testeAscensao = gerarTesteAscensao(alvoDesejado, today);
    }
  }

  const ofensiva = calcOfensiva(m5, today);
  const ofensivaCompartilhada = ctx.partnerMissoesCumpridas ? calcOfensivaCompartilhada(m5, ctx.partnerMissoesCumpridas, today) : 0;
  const prsTotais = detectPRs(ctx.weightLogs).filter((w) => w.isPR).length;
  const bonusTendenciaGordura = calcBonusTendenciaGordura(ctx.bodyCompHistorico, ctx.user.sexo, ctx.altura, today);
  const novosTitulos = calcTitulos({
    treinoTimestamps: prev.treinoTimestamps,
    ofensiva,
    ofensivaCompartilhada,
    temParceiro: ctx.temParceiro,
    prsTotais,
    missoesCumpridas: m5,
    bonusTendenciaGordura,
  });
  const titulosDesbloqueados = Array.from(new Set([...prev.titulosDesbloqueados, ...novosTitulos]));

  return {
    xpCheckpoint,
    titulosDesbloqueados,
    rankAtual,
    missoesCumpridas: m5,
    testeAscensao,
    treinoTimestamps: prev.treinoTimestamps,
    raidsConcluidos,
    protetorDisponivel: t1.protetorDisponivel,
    diasLimposSeguidosProtetor: t1.diasLimposSeguidosProtetor,
    ultimoDiaProcessado: today,
    ultimoResultadoAscensao,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRPGParams {
  ready: boolean;
  userId: string | null;
  outroId: string | null;
  user: User | null;
  temParceiro: boolean;
  checks: CheckEntry[];
  mealLog: MealLog;
  waters: WaterEntry[];
  treino: TreinoDia[] | null;
  weightLogs: WeightLogLike[];
  bodyCompHistorico: MedicaoEntry[];
}

export interface ToastEntry {
  id: number;
  amount: number;
  label?: string;
}

export interface RaidView extends RaidSemanal {
  progresso: number;
  concluida: boolean;
}

export interface RaidParceiroView {
  ready: boolean;
  missoesEstaSemanaConcluidas: number;
}

export function useRPG(params: UseRPGParams) {
  const { ready, userId, outroId, user, temParceiro, checks, mealLog, waters, treino, weightLogs, bodyCompHistorico } = params;

  const [loaded, setLoaded] = useState(false);
  const [rpgData, setRpgData] = useState<RPGData | null>(null);
  const [partnerData, setPartnerData] = useState<RPGData | null>(null);
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const toastSeq = useRef(0);

  // carrega o proprio estado + o do parceiro (so leitura) quando muda de conta
  useEffect(() => {
    if (!ready || !userId) { setLoaded(false); return; }
    let cancelled = false;
    (async () => {
      const [own, partner] = await Promise.all([
        kvGet<RPGData>(`${userId}_rpg`, null),
        outroId ? kvGet<RPGData>(`${outroId}_rpg`, null) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setRpgData(own || rpgDefault(todayStr()));
      setPartnerData(partner);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [ready, userId, outroId]);

  // recalcula + persiste a cada mudanca relevante de dados
  useEffect(() => {
    if (!loaded || !rpgData || !userId || !user) return;
    const today = todayStr();
    const altura = num(user.altura);
    const idade = num(user.idade);
    const peso = num(bodyCompHistorico[0]?.peso);
    const tmb = calcTMB({ sexo: user.sexo, peso, altura, idade });

    const ctx: StepRPGCtx = {
      today,
      now: Date.now(),
      userId,
      outroId,
      temParceiro,
      checks,
      mealLog,
      waters,
      treino,
      weightLogs,
      user: { kcalMeta: user.kcalMeta, waterMeta: user.waterMeta, proteinaMeta: user.proteinaMeta, sexo: user.sexo },
      tmb,
      bodyCompHistorico,
      altura,
      partnerMissoesCumpridas: partnerData?.missoesCumpridas || null,
    };

    const next = stepRPG(rpgData, ctx);
    if (JSON.stringify(next) === JSON.stringify(rpgData)) return;

    const antesIds = new Set((rpgData.missoesCumpridas[today]?.missoes || []).filter((m) => m.cumprida).map((m) => m.id));
    const novasCumpridas = (next.missoesCumpridas[today]?.missoes || []).filter((m) => m.cumprida && m.xp > 0 && !antesIds.has(m.id));
    if (novasCumpridas.length) {
      toastSeq.current += novasCumpridas.length;
      setToasts((t) => [...t, ...novasCumpridas.map((m, i) => ({ id: toastSeq.current - novasCumpridas.length + i, amount: m.xp, label: m.titulo }))]);
    }

    setRpgData(next);
    kvSet(`${userId}_rpg`, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, rpgData, partnerData, userId, outroId, temParceiro, checks, mealLog, waters, treino, weightLogs, user, bodyCompHistorico]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const registrarTreinoConcluido = useCallback((status: string) => {
    if (status === "none" || !rpgData || !userId) return;
    const today = todayStr();
    if (rpgData.treinoTimestamps[today]) return; // primeiro check-in do dia vence
    const next = { ...rpgData, treinoTimestamps: { ...rpgData.treinoTimestamps, [today]: Date.now() } };
    setRpgData(next);
    kvSet(`${userId}_rpg`, next);
  }, [rpgData, userId]);

  const today = todayStr();

  const { checkpoint: xpCheckpointAtual, xpTotal } = useMemo(() => {
    if (!rpgData) return { checkpoint: checkpointInicial(today), xpTotal: 0 };
    return calcXPTotal(rpgData.xpCheckpoint, rpgData.missoesCumpridas, today);
  }, [rpgData?.xpCheckpoint, rpgData?.missoesCumpridas, today]);
  void xpCheckpointAtual;

  const nivelInfo = useMemo(() => nivelFromXP(xpTotal), [xpTotal]);

  const ofensiva = useMemo(() => (rpgData ? calcOfensiva(rpgData.missoesCumpridas, today) : 0), [rpgData?.missoesCumpridas, today]);
  const ofensivaCompartilhada = useMemo(
    () => (rpgData && partnerData ? calcOfensivaCompartilhada(rpgData.missoesCumpridas, partnerData.missoesCumpridas, today) : 0),
    [rpgData?.missoesCumpridas, partnerData?.missoesCumpridas, today]
  );

  const tmb = useMemo(() => {
    if (!user) return null;
    return calcTMB({ sexo: user.sexo, peso: num(bodyCompHistorico[0]?.peso), altura: num(user.altura), idade: num(user.idade) });
  }, [user, bodyCompHistorico]);

  const atributos: Atributos = useMemo(() => {
    if (!user) return { FOR: 1, RES: 1, DIS: 1, NUT: 1, VIT: 1 };
    return calcAtributos({
      today, checks, waters, mealLog, treino, weightLogs,
      kcalMeta: user.kcalMeta, waterMeta: user.waterMeta, proteinaMeta: user.proteinaMeta,
      tmb, ofensiva, bodyCompHistorico, sexo: user.sexo, altura: num(user.altura),
    });
  }, [user, today, checks, waters, mealLog, treino, weightLogs, tmb, ofensiva, bodyCompHistorico]);

  const rank = rpgData?.rankAtual || "E";
  const rankElegivel = rankPorNivel(nivelInfo.nivel);

  const missoesHoje = rpgData?.missoesCumpridas[today]?.missoes || [];
  const redencaoAtiva = !!rpgData?.missoesCumpridas[today]?.redencaoAtiva;

  const raidDaSemana: RaidView | null = useMemo(() => {
    if (!rpgData || !userId) return null;
    const weekStart = getWeekStart(today);
    const raid = gerarRaidDaSemana(weekStart, { userId, outroId }, { temParceiro });
    if (!raid) return null;
    const progresso = calcularProgressoRaid(rpgData.missoesCumpridas, partnerData?.missoesCumpridas || null, weekStart);
    return { ...raid, progresso, concluida: !!rpgData.raidsConcluidos[weekStart] };
  }, [rpgData, partnerData, userId, outroId, temParceiro, today]);

  const raidParceiro: RaidParceiroView | null = useMemo(() => {
    if (!temParceiro) return null;
    if (!partnerData) return { ready: false, missoesEstaSemanaConcluidas: 0 };
    const weekStart = getWeekStart(today);
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      total += partnerData.missoesCumpridas[date]?.missoes.filter((m) => m.cumprida && !isMarcador(m.id)).length || 0;
    }
    return { ready: true, missoesEstaSemanaConcluidas: total };
  }, [temParceiro, partnerData, today]);

  // Nivel/rank do parceiro (so leitura) — pra badges em RankingTab/ComparativoScreen.
  const parceiro = useMemo(() => {
    if (!temParceiro) return null;
    if (!partnerData) return { ready: false, nivel: 0, rank: "E" as Rank };
    const { xpTotal: xpTotalParceiro } = calcXPTotal(partnerData.xpCheckpoint, partnerData.missoesCumpridas, today);
    const { nivel: nivelParceiro } = nivelFromXP(xpTotalParceiro);
    return { ready: true, nivel: nivelParceiro, rank: partnerData.rankAtual };
  }, [temParceiro, partnerData, today]);

  // Regra de seguranca #1, visivel no card compacto da Home no mesmo dia.
  const nutricaoAbaixoDoMinimo = useMemo(() => {
    if (!user) return false;
    const totais = totaisDoDia(mealLog, today);
    if (totais.kcal <= 0) return false;
    const piso = Math.max(tmb || 0, user.kcalMeta * 0.9);
    return totais.kcal < piso;
  }, [user, mealLog, today, tmb]);

  return {
    ready: loaded,
    nivel: nivelInfo.nivel,
    xpAtual: nivelInfo.xpAtual,
    xpProximo: nivelInfo.xpProximo,
    xpTotal,
    rank,
    rankElegivel,
    atributos,
    ofensiva,
    ofensivaCompartilhada,
    missoesHoje,
    redencaoAtiva,
    titulosDesbloqueados: rpgData?.titulosDesbloqueados || [],
    testeAscensao: rpgData?.testeAscensao || null,
    ultimoResultadoAscensao: rpgData?.ultimoResultadoAscensao || null,
    raidDaSemana,
    raidParceiro,
    parceiro,
    toasts,
    dismissToast,
    registrarTreinoConcluido,
    nutricaoAbaixoDoMinimo,
    protetorDisponivel: rpgData?.protetorDisponivel ?? true,
  };
}

export type RPGApi = ReturnType<typeof useRPG>;
