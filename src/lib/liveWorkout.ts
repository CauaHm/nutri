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
export function parseSetsFromProto(proto: string): number {
  const m = (proto || "").match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 3;
  return n > 0 && n <= 15 ? n : 3;
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
          // Aquecimento pre-calcula a partir do % do peso de referencia
          // (arredondado pra 0.5kg); qualquer outro tipo mantem o
          // pre-preenchimento de sempre (ultimo kg registrado).
          weight:
            s.tipo === "aquecimento"
              ? hasReference && typeof s.percentual === "number"
                ? String(Math.round(referenceWeight * (s.percentual / 100) * 2) / 2)
                : ""
              : referenceWeightStr,
          tipo: s.tipo,
          reps: s.reps,
          rir: s.rir,
          percentual: s.percentual,
        })),
      };
    }),
  };
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
