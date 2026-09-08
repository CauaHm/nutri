import type { Exercicio, SerieConfig } from "./defaults";
import { parseProtocolo, parseSetsFromProto } from "./liveWorkout";

// Fonte unica de verdade pra "quantas series/que tipo tem esse exercicio" —
// todo consumidor deve ler por aqui, nunca chamar parseSetsFromProto direto
// pra essa pergunta (mesmo padrao de getRestSeconds em restTimer.ts).
// Series definidas manualmente (ex.series) tem prioridade; na ausencia
// (estado valido permanente, nao "ainda nao migrado"), deriva um plano
// legado 100% "normal" a partir do proto de texto livre.
export function getSeriesPlan(ex: Exercicio): SerieConfig[] {
  if (ex.series && ex.series.length > 0) return ex.series;
  const segmentos = parseProtocolo(ex.proto);
  if (segmentos.length === 0) {
    return Array.from({ length: parseSetsFromProto(ex.proto) }, () => ({ tipo: "normal" as const }));
  }
  // Um plano legado continua 100% "normal" (classificar sozinho o que e
  // aquecimento seria inventar intencao que o proto nao diz), mas ao menos
  // respeita a contagem e as reps de cada trecho.
  return segmentos.flatMap((seg) => Array.from({ length: seg.sets }, () => ({ tipo: "normal" as const, reps: seg.reps })));
}

// Texto bruto apos o primeiro x/X/× do proto, ex: "4×8-10" -> "8-10".
// Deliberadamente NAO usa o regex de parseRepsFromProto (captura so o
// primeiro digito e cortaria o "-10") — aqui queremos o texto mais fiel
// possivel como ponto de partida editavel.
function rawRepsFromProto(proto: string): string {
  const m = (proto || "").match(/[×xX]\s*(.+)/);
  return m ? m[1].trim() : "";
}

// Numero inteiro logo apos o x/X/× (so o primeiro digito) — usado so pra
// heuristica de quantidade de aquecimento, nao pro texto de reps final.
function leadingRepsInt(proto: string): number | null {
  const m = (proto || "").match(/[×xX]\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

const RAMP_POR_QTD: Record<number, number[]> = {
  3: [50, 70, 85],
  2: [50, 75],
  1: [60],
};

// Heuristica do botao "Gerar automaticamente": monta uma rampa de
// aquecimento (proxy pro rep-range, ja que o proto nao guarda carga) +
// series de trabalho em RIR 2, com opcao de levar a ultima ate a falha.
// Pesquisa aplicada: RIR 1-3 = trabalho "duro" padrao pra hipertrofia/forca;
// aquecimento tipicamente 2-4 series em rampa de ~50%->85% do peso de
// trabalho, cargas/rep-ranges mais pesados pedem mais series de aquecimento.
export function buildAutoSeriesPlan(ex: Exercicio, opts?: { lastSetToFailure?: boolean }): SerieConfig[] {
  const segmentos = parseProtocolo(ex.proto);

  // Proto com mais de um trecho ja diz onde esta o aquecimento: "1×10 + 3×8"
  // e literalmente "1 serie de 10 antes, 3 de 8 valendo". Nesse caso o
  // protocolo manda e a heuristica de rampa nem entra — ela so existe pra
  // protocolo de um trecho so, que nao diz nada sobre aquecimento.
  const temAquecimentoExplicito = segmentos.length > 1;
  const ultimo = segmentos[segmentos.length - 1];

  const workingSetsCount = temAquecimentoExplicito ? ultimo.sets : parseSetsFromProto(ex.proto);
  const reps = temAquecimentoExplicito ? ultimo.reps : rawRepsFromProto(ex.proto);

  const leadingReps = leadingRepsInt(ex.proto);
  const warmupCount = leadingReps === null ? 2 : leadingReps <= 6 ? 3 : leadingReps <= 10 ? 2 : 1;
  const ramp = RAMP_POR_QTD[warmupCount] || RAMP_POR_QTD[2];

  const warmups: SerieConfig[] = temAquecimentoExplicito
    ? segmentos.slice(0, -1).flatMap((seg) =>
        Array.from({ length: seg.sets }, (_, i) => ({
          tipo: "aquecimento" as const,
          reps: seg.reps,
          // Uma serie de aquecimento so: 60%. Varias: rampa ate 85%.
          percentual: seg.sets === 1 ? 60 : Math.round(50 + (35 * i) / Math.max(1, seg.sets - 1)),
        })),
      )
    : ramp.map((percentual) => ({ tipo: "aquecimento", percentual }));

  const working: SerieConfig[] = Array.from({ length: workingSetsCount }, () => ({ tipo: "reserva" as const, rir: 2, reps }));
  if (opts?.lastSetToFailure && working.length > 0) {
    const last = working[working.length - 1];
    working[working.length - 1] = { tipo: "falha", reps: last.reps };
  }

  return [...warmups, ...working];
}
