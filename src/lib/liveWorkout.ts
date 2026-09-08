import type { TipoSerie, TreinoDia } from "./defaults";
import type { WeightLog } from "./useAppData";
import { getSeriesPlan } from "./seriesPlan";

export interface LiveSetEntry {
  setIndex: number;
  done: boolean;
  weight?: string;
  // Espelha o SerieConfig de origem (getSeriesPlan) — tudo opcional pra
  // sessoes antigas/exercicios sem plano continuarem exatamente iguais.
  tipo?: TipoSerie;
  reps?: string;
  rir?: number;
  percentual?: number;
  // Peso que estava planejado pra esta serie quando a sessao comecou. Guardado
  // separado de `weight` (que o usuario altera durante o treino) so pra dar
  // pra mostrar "planejado: 40kg" ao lado do que ele esta levantando de fato.
  pesoPlanejado?: string;
}

export interface LiveExerciseProgress {
  exId?: number;
  nome: string;
  sets: LiveSetEntry[];
}

export interface LiveWorkoutSession {
  dayIndex: number;
  dayTag: string;
  startedAt: number;
  currentExerciseIndex: number;
  exercises: LiveExerciseProgress[];
}

export interface SessionSummary {
  durationMs: number;
  exercisesCompleted: number;
  totalExercises: number;
  prs: string[];
  status: "completo" | "parcial" | "none";
}

// proto e texto livre tipo "3×12" — sem campo estruturado de series/reps
// ainda, entao isso e uma heuristica de leitura, nao uma fonte de verdade.

export interface SegmentoProto {
  sets: number;
  reps: string;
}

// Quebra o proto nos seus trechos "N×reps": "3×12" da um segmento so, e
// "1×10 + 3×8" da dois (o formato de aquecimento + trabalho que este app usa
// bastante). Ler so o primeiro numero, como se fazia antes, transformava
// "1×10 + 3×8" em UMA serie — o oposto do que o texto diz.
export function parseProtocolo(proto: string): SegmentoProto[] {
  const encontrados = [...(proto || "").matchAll(/(\d+)\s*[×xX]\s*(\d+(?:\s*-\s*\d+)?)/g)];
  return encontrados
    .map((m) => ({ sets: parseInt(m[1], 10), reps: m[2].replace(/\s/g, "") }))
    .filter((seg) => seg.sets > 0 && seg.sets <= 15);
}

// Quantas series o proto descreve no total (somando os segmentos). Sem
// nenhum segmento reconhecivel, mantem o padrao historico de 3.
export function parseSetsFromProto(proto: string): number {
  const total = parseProtocolo(proto).reduce((n, seg) => n + seg.sets, 0);
  return total > 0 && total <= 15 ? total : 3;
}

export function parseRepsFromProto(proto: string): string {
  const m = (proto || "").match(/[×xX]\s*(\d+)/);
  return m ? m[1] : "";
}

export function buildInitialSession(dia: TreinoDia, dayIndex: number, weightLogs: WeightLog[]): LiveWorkoutSession {
  return {
    dayIndex,
    dayTag: dia.tag,
    startedAt: Date.now(),
    currentExerciseIndex: 0,
    exercises: dia.exercicios.map((ex) => {
      // weightLogs vem mais-recente-primeiro (saveWeightLog sempre insere no
      // topo), mesma logica ja usada em CargasScreen pra achar o ultimo registro.
      const referenceWeightStr = weightLogs.find((l) => l.ex === ex.nome)?.kg || "";
      const referenceWeight = parseFloat(referenceWeightStr);
      const hasReference = referenceWeightStr !== "" && !isNaN(referenceWeight);
      return {
        exId: ex.id,
        nome: ex.nome,
        sets: getSeriesPlan(ex).map((s, i) => ({
          setIndex: i,
          done: false,
          // Ordem de preferencia pro campo de peso: o que foi planejado pra
          // esta serie (decidido antes do treino) manda; sem isso, aquecimento
          // pre-calcula a partir do % do peso de referencia (arredondado pra
          // 0.5kg) e qualquer outro tipo mantem o pre-preenchimento de sempre
          // (ultimo kg registrado).
          weight:
            s.peso ||
            (s.tipo === "aquecimento"
              ? hasReference && typeof s.percentual === "number"
                ? String(Math.round(referenceWeight * (s.percentual / 100) * 2) / 2)
                : ""
              : referenceWeightStr),
          pesoPlanejado: s.peso,
          tipo: s.tipo,
          reps: s.reps,
          rir: s.rir,
          percentual: s.percentual,
        })),
      };
    }),
  };
}

// Reps que vao pro registro de carga (WeightLog.reps) ao finalizar o treino.
// Prefere o que estava planejado nas series de trabalho concluidas — e o dado
// mais fiel do que foi feito hoje — e so cai no proto (texto livre, ex "3×12")
// quando nenhuma delas tem reps definidas. Empate vai pra mais frequente.
export function repsParaLog(setsConcluidas: LiveSetEntry[], proto: string): string {
  const reps = setsConcluidas.map((s) => s.reps).filter((r): r is string => !!r);
  if (reps.length === 0) return parseRepsFromProto(proto);
  const contagem = new Map<string, number>();
  for (const r of reps) contagem.set(r, (contagem.get(r) || 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// Historico de carga de um exercicio, mais recente primeiro (weightLogs ja
// vem nessa ordem — saveWeightLog sempre insere no topo). E o que a tela do
// treino ao vivo mostra pra pessoa decidir a carga de hoje olhando a de antes.
export function historicoDoExercicio(weightLogs: WeightLog[], nome: string, limite = 3): WeightLog[] {
  return weightLogs.filter((l) => l.ex === nome).slice(0, limite);
}

// Maior kg ja registrado no exercicio — mesma definicao de PR usada em
// CargasScreen e em computeSummary.
export function recordeDoExercicio(weightLogs: WeightLog[], nome: string): number {
  return Math.max(0, ...weightLogs.filter((l) => l.ex === nome).map((l) => parseFloat(l.kg) || 0));
}

// Series de trabalho (exclui aquecimento) — fonte unica pro que conta como
// "serie feita de verdade" pra fins de PR/historico (evita que um peso de
// aquecimento digitado maior que o de trabalho vire PR por acidente).
export function workingSets(sets: LiveSetEntry[]): LiveSetEntry[] {
  return sets.filter((s) => s.tipo !== "aquecimento");
}

export function sessionCompletionRatio(session: LiveWorkoutSession): number {
  const all = session.exercises.flatMap((e) => e.sets);
  return all.length ? all.filter((s) => s.done).length / all.length : 0;
}

export const COMPLETO_THRESHOLD = 0.9;

export function statusFromRatio(ratio: number): "completo" | "parcial" | "none" {
  if (ratio <= 0) return "none";
  return ratio >= COMPLETO_THRESHOLD ? "completo" : "parcial";
}

// PRs: mesma logica de CargasScreen (maior kg registrado por exercicio),
// comparando o maximo desta sessao contra o maximo previo em weightLogs.
export function computeSummary(session: LiveWorkoutSession, weightLogsBefore: WeightLog[]): SessionSummary {
  const exercisesCompleted = session.exercises.filter((e) => e.sets.length > 0 && e.sets.every((s) => s.done)).length;
  const prs: string[] = [];
  for (const ex of session.exercises) {
    const doneWeights = workingSets(ex.sets).filter((s) => s.done && s.weight).map((s) => parseFloat(s.weight!) || 0);
    if (!doneWeights.length) continue;
    const sessionMax = Math.max(...doneWeights);
    const priorMax = Math.max(0, ...weightLogsBefore.filter((l) => l.ex === ex.nome).map((l) => parseFloat(l.kg) || 0));
    if (sessionMax > priorMax) prs.push(ex.nome);
  }
  return {
    durationMs: Date.now() - session.startedAt,
    exercisesCompleted,
    totalExercises: session.exercises.length,
    prs,
    status: statusFromRatio(sessionCompletionRatio(session)),
  };
}
