import type { Exercicio, TreinoDia } from "./defaults";

const LOWER_BODY_KEYWORDS = [
  "perna", "pernas", "coxa", "quadríceps", "quadriceps", "posterior",
  "gluteo", "glúteo", "panturrilha", "adutor", "abdutor", "agachamento", "leg",
];

export function inferDefaultRestSeconds(ex: { foco?: string }, dia?: Pick<TreinoDia, "tag">): number {
  const haystack = `${ex.foco || ""} ${dia?.tag || ""}`.toLowerCase();
  return LOWER_BODY_KEYWORDS.some((k) => haystack.includes(k)) ? 90 : 60;
}

// Valor efetivo de descanso pra um exercicio — sempre ler por aqui, nunca
// ex.restSeconds direto em outro arquivo (cobre o caso de dados antigos
// sem o campo).
export function getRestSeconds(ex: Exercicio, dia?: Pick<TreinoDia, "tag">): number {
  return typeof ex.restSeconds === "number" && ex.restSeconds > 0
    ? ex.restSeconds
    : inferDefaultRestSeconds(ex, dia);
}
