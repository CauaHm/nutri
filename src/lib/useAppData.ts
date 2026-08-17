import { useState, useEffect, useCallback } from "react";
import { kvGet, kvSet, kvGetMany } from "./clientStorage";
import { enqueueIntent } from "./offlineQueue";
import { applyAddFood, applyRemoveFood, applySetWater, applySetCheck, applyAddWeightLog } from "./mutations";
import { todayStr } from "./dates";
import { calcPontos, totaisDoDia, type MealLog, type WaterEntry, type CheckEntry, type MealItem } from "./points";
import { defaultRefeicoes, defaultCompras, defaultReceitas, defaultTreinoGenerico, type RefeicaoConfig, type CompraItem, type Receita, type TreinoDia } from "./defaults";
import { useBodyComp } from "./useBodyComp";
import { useRPG } from "./useRPG";
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
  // addFoodToMeal/removeFoodFromMeal enfileiram uma intencao semantica (nao
  // um kvSet de objeto inteiro) — assim o flush da fila offline reconcilia
  // sobre o estado mais recente do servidor em vez de sobrescrever com um
  // snapshot local que pode ja estar desatualizado.
  const addFoodToMeal = useCallback((date: string, mealId: string, item: Record<string, any>) => {
    const newItem = { id: Date.now(), qty: 1, ...item } as MealItem; // id gerado uma unica vez — reaproveitado pelo estado local E pela intencao enfileirada, e o que torna o replay idempotente
    const next = applyAddFood(mealLog, date, mealId, newItem);
    setMealLogState(next);
    const { pts } = calcPontos(authUser, next, waters, checks, roundStart);
    checkWinAfter(pts);
    return enqueueIntent(userId!, { tipo: "addFood", data: date, mealId, item: newItem });
  }, [mealLog, waters, checks, roundStart, authUser, userId, checkWinAfter]);

  const removeFoodFromMeal = useCallback((date: string, mealId: string, itemId: number | string) => {
    const next = applyRemoveFood(mealLog, date, mealId, itemId);
    setMealLogState(next);
    const { pts } = calcPontos(authUser, next, waters, checks, roundStart);
    checkWinAfter(pts);
    return enqueueIntent(userId!, { tipo: "removeFood", data: date, mealId, itemId });
  }, [mealLog, waters, checks, roundStart, authUser, userId, checkWinAfter]);

  // ---- agua ----
  const saveWater = useCallback(async (date: string, liters: number) => {
    const next = applySetWater(waters, date, liters);
    setWatersState(next);
    const { pts } = calcPontos(authUser, mealLog, next, checks, roundStart);
    checkWinAfter(pts);
    await enqueueIntent(userId!, { tipo: "setWater", data: date, litros: liters });
  }, [waters, mealLog, checks, roundStart, authUser, userId, checkWinAfter]);

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
    const next = applySetCheck(checks, date, status);
    setChecksState(next);
    const { pts } = calcPontos(authUser, mealLog, waters, next, roundStart);
    checkWinAfter(pts);
    await enqueueIntent(userId!, { tipo: "setCheck", data: date, status });
  }, [checks, mealLog, waters, roundStart, authUser, userId, checkWinAfter]);

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
  // Forma funcional do setState (nao `next = [...weightLogs]` capturado no
  // closure) — LiveWorkoutScreen.finalizar() chama isto em loop, um por
  // exercicio, dentro do mesmo ciclo de render; com o closure antigo, cada
  // iteracao partia do mesmo `weightLogs` e so a ultima sobrevivia (bug
  // pre-existente). Seguro aqui porque esta funcao nunca chama
  // checkWinAfter (nao precisa de um `next` sincrono pra mais nada) — as
  // outras 4 funcoes acima precisam do `next` sincrono e nao sao chamadas
  // em loop, entao continuam na forma anterior.
  const saveWeightLog = useCallback(async (entry: Omit<WeightLog, "id">) => {
    const full: WeightLog = { id: Date.now(), ...entry };
    setWeightLogsState((prev) => applyAddWeightLog(prev, full));
    await enqueueIntent(userId!, { tipo: "addWeightLog", entry: full });
  }, [userId]);
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

  // "O Sistema" (camada de progressao RPG) — le os mesmos dados em paralelo,
  // nunca muda como calcPontos/o resto acima funciona. useBodyComp aqui e
  // uma segunda instancia isolada, so pra alimentar o atributo VIT.
  const bodyComp = useBodyComp(authUser);
  const rpg = useRPG({
    ready: ready && bodyComp.ready,
    userId,
    outroId,
    user,
    temParceiro: !!outroUser,
    checks,
    mealLog,
    waters,
    treino,
    weightLogs,
    bodyCompHistorico: bodyComp.historico,
  });

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
    rpg,
  };
}

export type AppData = ReturnType<typeof useAppData>;
