// Tipo/config de notificacoes push — lado cliente. Espelha
// api/_lib/notificacoes.ts (api/ e src/ sao projetos TS separados, sem
// imports cruzados — mesmo padrao que User ja e duplicado dos dois lados).
// Mudou algo aqui? Muda la tambem.

export type TipoNotificacao =
  | "agua" | "treino" | "fimDeRodada" | "refeicao"
  | "pesagem" | "parceiroPR" | "parceiroRanking" | "badge";

export interface NotificacoesConfig {
  agua: { on: boolean; horarios: string[] };
  treino: { on: boolean; horario: string };
  fimDeRodada: { on: boolean };
  refeicao: { on: boolean };
  pesagem: { on: boolean };
  parceiroPR: { on: boolean };
  parceiroRanking: { on: boolean };
  badge: { on: boolean };
  quietHours: { inicio: string; fim: string };
}

export const NOTIFICACOES_PADRAO: NotificacoesConfig = {
  agua: { on: true, horarios: ["10:00", "15:00", "19:00"] },
  treino: { on: true, horario: "17:00" },
  fimDeRodada: { on: true },
  refeicao: { on: false },
  pesagem: { on: false },
  parceiroPR: { on: false },
  parceiroRanking: { on: false },
  badge: { on: false },
  quietHours: { inicio: "22:00", fim: "07:00" },
};

// Fallback pra contas antigas sem o campo — mesmo padrao que
// MINUTOS_ATIVOS_META_PADRAO em atividades.ts. Nunca leia user.notificacoes
// cru, sempre passe por aqui.
export function mergeNotificacoes(saved?: Partial<NotificacoesConfig> | null): NotificacoesConfig {
  const s = saved || {};
  return {
    agua: { ...NOTIFICACOES_PADRAO.agua, ...(s.agua || {}) },
    treino: { ...NOTIFICACOES_PADRAO.treino, ...(s.treino || {}) },
    fimDeRodada: { ...NOTIFICACOES_PADRAO.fimDeRodada, ...(s.fimDeRodada || {}) },
    refeicao: { ...NOTIFICACOES_PADRAO.refeicao, ...(s.refeicao || {}) },
    pesagem: { ...NOTIFICACOES_PADRAO.pesagem, ...(s.pesagem || {}) },
    parceiroPR: { ...NOTIFICACOES_PADRAO.parceiroPR, ...(s.parceiroPR || {}) },
    parceiroRanking: { ...NOTIFICACOES_PADRAO.parceiroRanking, ...(s.parceiroRanking || {}) },
    badge: { ...NOTIFICACOES_PADRAO.badge, ...(s.badge || {}) },
    quietHours: { ...NOTIFICACOES_PADRAO.quietHours, ...(s.quietHours || {}) },
  };
}
