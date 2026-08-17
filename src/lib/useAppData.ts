import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet, kvGetMany } from "./clientStorage";
import { todayStr } from "./dates";
import { calcPontos, itensDaRefeicao, totaisDoDia, type MealLog, type WaterEntry, type CheckEntry } from "./points";
import { defaultRefeicoes, defaultCompras, defaultReceitas, defaultTreinoGenerico, type RefeicaoConfig, type CompraItem, type Receita, type TreinoDia } from "./defaults";
import type { User } from "./types";
import type { CompetitionApi } from "./useCompetition";
import type { LiveWorkoutSession } from "./liveWorkout";

const META_PONTOS_PADRAO = 150;

export interface WeightLog {
  id: number;
  ex: string;
  data: string;
  kg: string;
  sets: string;
  reps: string;
}

export interface Recado {
  id: number;
  from: string | null;
  to: string | null;
  text: string;
  date: string;
}

// authUser: usuario logado (de useAuth). comp: { competition, partner, ... } (de useCompetition).
// Dados pessoais ficam sob a chave do proprio usuario; dados compartilhados
// (compras/receitas/recados) ficam sob a competicao quando existe uma, ou
// sob o proprio usuario quando ainda esta sozinho (uso pessoal ate convidar
// alguem).
export function useAppData(authUser: User, comp: CompetitionApi) {
  const userId = authUser?._id || null;
  const outroId = comp.partner?._id || null;
  const sharedPrefix = comp.competition ? `comp_${comp.competition._id}` : userId;

  const [ready, setReady] = useState(false);
  const [treino, setTreinoState] = useState<TreinoDia[] | null>(null);
  const [refeicoesCfg, setRefeicoesCfgState] = useState<RefeicaoConfig[] | null>(null);
  const [mealLog, setMealLogState] = useState<MealLog>({});
  const [waters, setWatersState] = useState<WaterEntry[]>([]);
  const [checks, setChecksState] = useState<CheckEntry[]>([]);
  const [weightLogs, setWeightLogsState] = useState<WeightLog[]>([]);
  const [liveSession, setLiveSessionState] = useState<LiveWorkoutSession | null>(null);

  const [outroMealLog, setOutroMealLog] = useState<MealLog>({});
  const [outroWaters, setOutroWaters] = useState<WaterEntry[]>([]);
  const [outroChecks, setOutroChecks] = useState<CheckEntry[]>([]);

  const [compras, setComprasState] = useState<CompraItem[]>(defaultCompras());
  const [receitas, setReceitasState] = useState<Receita[]>(defaultReceitas());
  const [recados, setRecadosState] = useState<Recado[]>([]);

  const [showPrize, setShowPrize] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const roundStart = comp.competition?.roundStart || null;
  const historico = comp.competition?.historico || [];
  const metaPontos = comp.competition?.metaPontos || META_PONTOS_PADRAO;

  // Carrega tudo relacionado ao usuario ativo + parceiro de uma vez.
  useEffect(() => {
    if (!userId || !comp.ready) return;
    setReady(false);
    (async () => {
      const keys = [
        `${userId}_treino`, `${userId}_refeicoes_cfg`, `${userId}_refeicoes_log`,
        `${userId}_water`, `${userId}_check`, `${userId}_wlogs`, `${userId}_treino_sessao`,
        `${sharedPrefix}_compras`, `${sharedPrefix}_receitas`, `${sharedPrefix}_recados`,
      ];
      if (outroId) keys.push(`${outroId}_refeicoes_log`, `${outroId}_water`, `${outroId}_check`);
      const v = await kvGetMany(keys);
      setTreinoState(v[`${userId}_treino`] || defaultTreinoGenerico());
      setRefeicoesCfgState(v[`${userId}_refeicoes_cfg`] || defaultRefeicoes());
      setMealLogState(v[`${userId}_refeicoes_log`] || {});
      setWatersState(v[`${userId}_water`] || []);
      setChecksState(v[`${userId}_check`] || []);
      setWeightLogsState(v[`${userId}_wlogs`] || []);
      setLiveSessionState(v[`${userId}_treino_sessao`] || null);
      setComprasState(v[`${sharedPrefix}_compras`] || defaultCompras());
      setReceitasState(v[`${sharedPrefix}_receitas`] || defaultReceitas());
      setRecadosState(v[`${sharedPrefix}_recados`] || []);
      setOutroMealLog(outroId ? v[`${outroId}_refeicoes_log`] || {} : {});
      setOutroWaters(outroId ? v[`${outroId}_water`] || [] : []);
      setOutroChecks(outroId ? v[`${outroId}_check`] || [] : []);
      setReady(true);
    })();
  }, [userId, outroId, sharedPrefix, comp.ready]);

  const checkWinAfter = useCallback((pts: number) => {
    if (pts >= metaPontos && !showPrize && comp.competition) {
      setWinner(userId);
      setShowPrize(true);
    }
  }, [metaPontos, showPrize, comp.competition, userId]);

  // ---- treino ----
  const saveTreino = useCallback(async (next: TreinoDia[]) => {
    setTreinoState(next);
    await kvSet(`${userId}_treino`, next);
  }, [userId]);

  // ---- refeicoes (config das refeicoes do dia) ----
  const saveRefeicoesCfg = useCallback(async (next: RefeicaoConfig[]) => {
    setRefeicoesCfgState(next);
    await kvSet(`${userId}_refeicoes_cfg`, next);
  }, [userId]);

  // ---- log de refeicoes: cada refeicao guarda uma lista de itens comidos ----
  const persistMealLog = useCallback(async (next: MealLog) => {
    setMealLogState(next);
    await kvSet(`${userId}_refeicoes_log`, next);
    const { pts } = calcPontos(authUser, next, waters, checks, roundStart);
    checkWinAfter(pts);
  }, [userId, authUser, waters, checks, roundStart, checkWinAfter]);

  const addFoodToMeal = useCallback((date: string, mealId: string, item: Record<string, any>) => {
    const dia = { ...(mealLog[date] || {}) };
    const itens = itensDaRefeicao(dia[mealId]);
    dia[mealId] = [...itens, { id: Date.now(), qty: 1, ...item } as (typeof itens)[number]];
    return persistMealLog({ ...mealLog, [date]: dia });
  }, [mealLog, persistMealLog]);

  const removeFoodFromMeal = useCallback((date: string, mealId: string, itemId: number | string) => {
    const dia = { ...(mealLog[date] || {}) };
    const itens = itensDaRefeicao(dia[mealId]).filter((it) => it.id !== itemId);
    dia[mealId] = itens;
    return persistMealLog({ ...mealLog, [date]: dia });
  }, [mealLog, persistMealLog]);

  // ---- agua ----
  const saveWater = useCallback(async (date: string, liters: number) => {
    const next = waters.find((l) => l.date === date)
      ? waters.map((l) => (l.date === date ? { ...l, liters } : l))
      : [{ date, liters }, ...waters];
    setWatersState(next);
    await kvSet(`${userId}_water`, next);
    const { pts } = calcPontos(authUser, mealLog, next, checks, roundStart);
    checkWinAfter(pts);
  }, [waters, userId, authUser, mealLog, checks, roundStart, checkWinAfter]);

  const delWater = useCallback(async (date: string) => {
    const next = waters.filter((l) => l.date !== date);
    setWatersState(next);
    await kvSet(`${userId}_water`, next);
  }, [waters, userId]);

  const addWaterQuick = useCallback((liters: number) => {
    const cur = waters.find((l) => l.date === todayStr());
    const total = Math.round(((cur?.liters || 0) + liters) * 100) / 100;
    saveWater(todayStr(), total);
  }, [waters, saveWater]);

  // ---- check de treino ----
  const saveCheck = useCallback(async (date: string, status: string) => {
    const next = checks.find((l) => l.date === date)
      ? checks.map((l) => (l.date === date ? { ...l, status } : l))
      : [{ date, status }, ...checks];
    setChecksState(next);
    await kvSet(`${userId}_check`, next);
    const { pts } = calcPontos(authUser, mealLog, waters, next, roundStart);
    checkWinAfter(pts);
  }, [checks, userId, authUser, mealLog, waters, roundStart, checkWinAfter]);

  const delCheck = useCallback(async (date: string) => {
    const next = checks.filter((l) => l.date !== date);
    setChecksState(next);
    await kvSet(`${userId}_check`, next);
  }, [checks, userId]);

  // ---- rodada / premio ----
  const novaRodada = useCallback(async () => {
    const today = todayStr();
    const nh = [{ winner, date: today }, ...historico];
    setShowPrize(false);
    setWinner(null);
    await comp.salvarCompeticao({ roundStart: today, historico: nh });
  }, [winner, historico, comp]);

  // ---- registro de carga (peso levantado) ----
  const saveWeightLog = useCallback(async (entry: Omit<WeightLog, "id">) => {
    const next = [{ id: Date.now(), ...entry }, ...weightLogs];
    setWeightLogsState(next);
    await kvSet(`${userId}_wlogs`, next);
  }, [weightLogs, userId]);
  const delWeightLog = useCallback(async (id: number) => {
    const next = weightLogs.filter((l) => l.id !== id);
    setWeightLogsState(next);
    await kvSet(`${userId}_wlogs`, next);
  }, [weightLogs, userId]);

  // ---- sessao de treino ao vivo (retomavel — 1 de cada vez) ----
  const saveLiveSession = useCallback(async (next: LiveWorkoutSession | null) => {
    setLiveSessionState(next);
    await kvSet(`${userId}_treino_sessao`, next);
  }, [userId]);

  // ---- compras / receitas (pessoal, ou compartilhado se ja tem dupla) ----
  const saveCompras = useCallback(async (next: CompraItem[]) => {
    setComprasState(next);
    await kvSet(`${sharedPrefix}_compras`, next);
  }, [sharedPrefix]);
  const saveReceitas = useCallback(async (next: Receita[]) => {
    setReceitasState(next);
    await kvSet(`${sharedPrefix}_receitas`, next);
  }, [sharedPrefix]);

  // ---- recados (mensagem pro parceiro) ----
  const sendRecado = useCallback(async (text: string) => {
    const next = [{ id: Date.now(), from: userId, to: outroId, text, date: todayStr() }, ...recados].slice(0, 30);
    setRecadosState(next);
    await kvSet(`${sharedPrefix}_recados`, next);
  }, [recados, userId, outroId, sharedPrefix]);

  const user = authUser;
  const outroUser = comp.partner;

  const myStats = user ? calcPontos(user, mealLog, waters, checks, roundStart) : null;
  const outroStats = outroUser ? calcPontos(outroUser, outroMealLog, outroWaters, outroChecks, roundStart) : null;

  const todayTotais = userId ? totaisDoDia(mealLog, todayStr()) : { kcal: 0, proteina: 0 };

  return {
    ready, userId, outroId, user, outroUser,
    config: { metaPontos, appName: "Rotina & Metas" },
    treino, saveTreino,
    refeicoesCfg, saveRefeicoesCfg,
    mealLog, addFoodToMeal, removeFoodFromMeal, outroMealLog, todayTotais,
    waters, saveWater, delWater, addWaterQuick, outroWaters,
    checks, saveCheck, delCheck, outroChecks,
    roundStart, historico, novaRodada, showPrize, winner,
    weightLogs, saveWeightLog, delWeightLog,
    liveSession, saveLiveSession,
    compras, saveCompras, receitas, saveReceitas,
    recados, sendRecado,
    myStats, outroStats,
    temParceiro: !!outroUser,
    invitesRecebidos: comp.invitesRecebidos,
    enviarConvite: comp.enviarConvite,
    responderConvite: comp.responderConvite,
    sairCompeticao: comp.sairCompeticao,
  };
}

export type AppData = ReturnType<typeof useAppData>;
