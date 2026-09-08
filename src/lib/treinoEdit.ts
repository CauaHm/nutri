import type { Exercicio, TreinoDia } from "./defaults";

// Operacoes de edicao do plano de treino, como funcoes puras (recebem o
// treino, devolvem um treino novo) — as telas so chamam e passam o resultado
// pro saveTreino. Ficam aqui, e nao dentro dos componentes, porque duplicar
// dia/exercicio precisa saber gerar id novo sem colidir, e essa regra tem que
// valer igual em qualquer tela que duplique.

// ex.id identifica o exercicio no cronometro de descanso (exId) e na sessao ao
// vivo, entao nao pode repetir dentro do plano. Date.now() sozinho colide
// quando se cria varios de uma vez (mesmo milissegundo), por isso o id novo
// sai sempre de "maior id existente + 1".
export function proximoIdExercicio(treino: TreinoDia[]): number {
  const ids = treino.flatMap((d) => d.exercicios.map((e) => e.id ?? 0));
  return Math.max(0, ...ids) + 1;
}

// Copias recebem id novo (o resto do exercicio vem igual, series inclusive).
function clonarExercicios(exercicios: Exercicio[], idInicial: number): Exercicio[] {
  return exercicios.map((e, i) => ({
    ...e,
    id: idInicial + i,
    series: e.series ? e.series.map((s) => ({ ...s })) : undefined,
  }));
}

// Sufixo "(cópia)" só na primeira vez, pra nao virar "(cópia) (cópia) (cópia)"
// quem duplica a mesma coisa varias vezes.
function comSufixoCopia(texto: string): string {
  return texto.endsWith("(cópia)") ? texto : `${texto} (cópia)`.trim();
}

// Duplica um dia inteiro e insere logo depois do original, pra copia aparecer
// ao lado de onde a pessoa clicou em vez de no fim da lista.
export function duplicarDia(treino: TreinoDia[], di: number): TreinoDia[] {
  const original = treino[di];
  if (!original) return treino;
  const copia: TreinoDia = {
    ...original,
    tag: comSufixoCopia(original.tag),
    exercicios: clonarExercicios(original.exercicios, proximoIdExercicio(treino)),
  };
  return [...treino.slice(0, di + 1), copia, ...treino.slice(di + 1)];
}

export function duplicarExercicio(treino: TreinoDia[], di: number, ei: number): TreinoDia[] {
  const dia = treino[di];
  const original = dia?.exercicios[ei];
  if (!original) return treino;
  const [copia] = clonarExercicios([original], proximoIdExercicio(treino));
  return treino.map((d, i) =>
    i === di ? { ...d, exercicios: [...d.exercicios.slice(0, ei + 1), copia, ...d.exercicios.slice(ei + 1)] } : d,
  );
}

export function moverExercicio(treino: TreinoDia[], di: number, ei: number, dir: -1 | 1): TreinoDia[] {
  const dia = treino[di];
  const destino = ei + dir;
  if (!dia || destino < 0 || destino >= dia.exercicios.length) return treino;
  const exercicios = [...dia.exercicios];
  [exercicios[ei], exercicios[destino]] = [exercicios[destino], exercicios[ei]];
  return treino.map((d, i) => (i === di ? { ...d, exercicios } : d));
}

// Copia um exercicio de um dia pro fim de outro — o atalho pra montar um dia
// novo reaproveitando o que ja existe, sem redigitar series e notas.
export function copiarExercicioParaDia(treino: TreinoDia[], diOrigem: number, ei: number, diDestino: number): TreinoDia[] {
  const original = treino[diOrigem]?.exercicios[ei];
  if (!original || !treino[diDestino] || diOrigem === diDestino) return treino;
  const [copia] = clonarExercicios([original], proximoIdExercicio(treino));
  return treino.map((d, i) => (i === diDestino ? { ...d, exercicios: [...d.exercicios, copia] } : d));
}
