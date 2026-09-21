import { useState, useEffect, useCallback, useMemo } from "react";
import { kvSet, kvGetMany } from "./clientStorage";
import { todayStr } from "./dates";
import {
  rotinaSeedCaua, mergeConfig, tarefasDoDia, entradaDe, contaComoFeito,
  resumoDoDia, serieDeDias, combinarDias, calcOfensiva, pendenciasDaSemana, padraoDaSemana,
  type RotinaTarefa, type RotinaLog, type RotinaConfig, type RotinaEntrada, type RotinaStatusEntrada,
} from "./rotina";

// Janela de historico que a gente carrega pra calcular ofensiva/recorde.
// 120 dias cobre com folga a meta de 60 e mantem o payload pequeno.
const JANELA_DIAS = 120;

export interface RotinaApi {
  ready: boolean;
  tarefas: RotinaTarefa[];
  config: RotinaConfig;
  log: RotinaLog;
  logParceiro: RotinaLog;
  hoje: string;

  /** Tarefas de hoje (minhas), ja ordenadas por horario. */
  doDia: RotinaTarefa[];
  resumoHoje: ReturnType<typeof resumoDoDia>;
  resumoHojeParceiro: ReturnType<typeof resumoDoDia> | null;

  serie: ReturnType<typeof serieDeDias>;
  serieParceiro: ReturnType<typeof serieDeDias>;
  ofensiva: ReturnType<typeof calcOfensiva>;
  ofensivaDupla: ReturnType<typeof calcOfensiva> | null;

  /** Tarefa acontecendo agora (ou a proxima do dia) — o card "Agora". */
  agora: RotinaTarefa | null;
  proxima: RotinaTarefa | null;

  pendencias: ReturnType<typeof pendenciasDaSemana>;
  padrao: ReturnType<typeof padraoDaSemana>;
  precisaRevisar: boolean;

  marcar: (taskId: string, status: RotinaStatusEntrada, extra?: { motivo?: string; horarioReal?: string }, dataBR?: string) => Promise<void>;
  desmarcar: (taskId: string, dataBR?: string) => Promise<void>;
  salvarTarefas: (next: RotinaTarefa[]) => Promise<void>;
  salvarConfig: (next: Partial<RotinaConfig>) => Promise<void>;
  aplicarSeed: () => Promise<void>;
}

interface Params {
  userId: string | null;
  outroId: string | null;
  sharedPrefix: string | null;
  temParceiro: boolean;
  nome: string;
}

export function useRotina({ userId, outroId, sharedPrefix, temParceiro }: Params): RotinaApi {
  const [ready, setReady] = useState(false);
  const [tarefas, setTarefas] = useState<RotinaTarefa[]>([]);
  const [config, setConfig] = useState<RotinaConfig>(mergeConfig(null));
  const [log, setLog] = useState<RotinaLog>({});
  const [logParceiro, setLogParceiro] = useState<RotinaLog>({});

  // Recalcula na virada do dia sem precisar de reload — `hoje` entra como
  // dependencia de tudo abaixo.
  const [hoje, setHoje] = useState(todayStr());
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayStr();
      setHoje((prev) => (prev === t ? prev : t));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId || !sharedPrefix) return;
    setReady(false);
    (async () => {
      const keys = [`${sharedPrefix}_rotina_tarefas`, `${sharedPrefix}_rotina_cfg`, `${userId}_rotina_log`];
      if (outroId) keys.push(`${outroId}_rotina_log`);
      const v = await kvGetMany(keys);
      setTarefas(v[`${sharedPrefix}_rotina_tarefas`] || []);
      setConfig(mergeConfig(v[`${sharedPrefix}_rotina_cfg`]));
      setLog(v[`${userId}_rotina_log`] || {});
      setLogParceiro(outroId ? v[`${outroId}_rotina_log`] || {} : {});
      setReady(true);
    })();
  }, [userId, outroId, sharedPrefix]);

  // ------------------------------------------------------------ derivados --

  const doDia = useMemo(() => tarefasDoDia(tarefas, hoje, userId), [tarefas, hoje, userId]);
  const resumoHoje = useMemo(() => resumoDoDia(tarefas, log, hoje, userId, hoje, config.inicio), [tarefas, log, hoje, userId, config.inicio]);
  const resumoHojeParceiro = useMemo(
    () => (outroId ? resumoDoDia(tarefas, logParceiro, hoje, outroId, hoje, config.inicio) : null),
    [tarefas, logParceiro, hoje, outroId, config.inicio]
  );

  const serie = useMemo(
    () => serieDeDias(tarefas, log, hoje, userId, JANELA_DIAS, config.inicio),
    [tarefas, log, hoje, userId, config.inicio]
  );
  const serieParceiro = useMemo(
    () => (outroId ? serieDeDias(tarefas, logParceiro, hoje, outroId, JANELA_DIAS, config.inicio) : []),
    [tarefas, logParceiro, hoje, outroId, config.inicio]
  );

  const ofensiva = useMemo(() => calcOfensiva(serie, config.meta), [serie, config.meta]);
  const ofensivaDupla = useMemo(
    () => (temParceiro && serieParceiro.length ? calcOfensiva(combinarDias(serie, serieParceiro), config.meta) : null),
    [temParceiro, serie, serieParceiro, config.meta]
  );

  // "Agora": bloco cuja janela contem o horario atual; se nenhum, a proxima
  // tarefa ainda nao concluida do dia. E o que mata a pergunta "o que eu
  // faco agora", que e onde a fuga entra.
  const { agora, proxima } = useMemo(() => {
    const d = new Date();
    const min = d.getHours() * 60 + d.getMinutes();
    const abertas = doDia.filter((t) => !contaComoFeito(entradaDe(log, hoje, t.id)));
    const dentro = abertas.find((t) => {
      const ini = Number(t.inicio.split(":")[0]) * 60 + Number(t.inicio.split(":")[1] || 0);
      const fim = t.fim ? Number(t.fim.split(":")[0]) * 60 + Number(t.fim.split(":")[1] || 0) : ini + 60;
      return min >= ini && min <= fim;
    });
    const seguinte = abertas.find((t) => {
      const ini = Number(t.inicio.split(":")[0]) * 60 + Number(t.inicio.split(":")[1] || 0);
      return ini > min;
    });
    return { agora: dentro || null, proxima: dentro ? seguinte || null : seguinte || abertas[0] || null };
  }, [doDia, log, hoje]);

  const pendencias = useMemo(() => pendenciasDaSemana(tarefas, log, hoje, userId, config.inicio), [tarefas, log, hoje, userId, config.inicio]);
  const padrao = useMemo(() => padraoDaSemana(tarefas, log, hoje, userId, config.inicio), [tarefas, log, hoje, userId, config.inicio]);
  // Domingo + tem pendencia sem resposta = a revisao do passo 10 esta devendo.
  const precisaRevisar = ready && new Date().getDay() === 0 && pendencias.length > 0;

  // ------------------------------------------------------------- acoes -----

  const avisarParceiro = useCallback(
    (evento: "tarefa" | "dia", texto: string) => {
      if (!temParceiro) return;
      // Best-effort, igual ao push de fim de rodada: nunca bloqueia a
      // marcacao nem precisa de retry. Teto diario, quiet-hours e
      // preferencia do destinatario ja sao aplicados no servidor
      // (api/_lib/push.ts) — aqui a gente so avisa que aconteceu.
      fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "parceiroRotina", evento, texto }),
      }).catch(() => {});
    },
    [temParceiro]
  );

  const marcar = useCallback(
    async (taskId: string, status: RotinaStatusEntrada, extra?: { motivo?: string; horarioReal?: string }, dataBR?: string) => {
      if (!userId) return;
      const data = dataBR || hoje;
      const entrada: RotinaEntrada = { status, em: new Date().toISOString(), ...(extra || {}) };
      const next: RotinaLog = { ...log, [data]: { ...(log[data] || {}), [taskId]: entrada } };
      setLog(next);
      await kvSet(`${userId}_rotina_log`, next);

      if (data !== hoje || !contaComoFeito(entrada)) return;
      const tarefa = tarefas.find((t) => t.id === taskId);
      if (tarefa?.avisar) avisarParceiro("tarefa", tarefa.titulo);

      // Fechou o dia com essa marcacao? Isso sempre avisa — e o X do dia.
      const antes = resumoDoDia(tarefas, log, data, userId, hoje, config.inicio);
      const depois = resumoDoDia(tarefas, next, data, userId, hoje, config.inicio);
      if (depois.status === "fechado" && antes.status !== "fechado") avisarParceiro("dia", String(depois.essenciaisTotal));
    },
    [userId, hoje, log, tarefas, config.inicio, avisarParceiro]
  );

  const desmarcar = useCallback(
    async (taskId: string, dataBR?: string) => {
      if (!userId) return;
      const data = dataBR || hoje;
      const doDiaLog = { ...(log[data] || {}) };
      delete doDiaLog[taskId];
      const next: RotinaLog = { ...log, [data]: doDiaLog };
      setLog(next);
      await kvSet(`${userId}_rotina_log`, next);
    },
    [userId, hoje, log]
  );

  const salvarTarefas = useCallback(
    async (next: RotinaTarefa[]) => {
      if (!sharedPrefix) return;
      setTarefas(next);
      await kvSet(`${sharedPrefix}_rotina_tarefas`, next);
    },
    [sharedPrefix]
  );

  const salvarConfig = useCallback(
    async (patch: Partial<RotinaConfig>) => {
      if (!sharedPrefix) return;
      const next = mergeConfig({ ...config, ...patch });
      setConfig(next);
      await kvSet(`${sharedPrefix}_rotina_cfg`, next);
    },
    [sharedPrefix, config]
  );

  const aplicarSeed = useCallback(async () => {
    if (!userId) return;
    await salvarTarefas(rotinaSeedCaua(userId));
    await salvarConfig({ inicio: hoje });
  }, [userId, hoje, salvarTarefas, salvarConfig]);

  return {
    ready, tarefas, config, log, logParceiro, hoje,
    doDia, resumoHoje, resumoHojeParceiro,
    serie, serieParceiro, ofensiva, ofensivaDupla,
    agora, proxima,
    pendencias, padrao, precisaRevisar,
    marcar, desmarcar, salvarTarefas, salvarConfig, aplicarSeed,
  };
}
