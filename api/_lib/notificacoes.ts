// Tipo/config de notificacoes push — lado servidor. Espelhado em
// src/lib/notificacoes.ts (api/ e src/ sao projetos TS separados, sem
// imports cruzados — mesmo padrao que User ja e duplicado dos dois lados).
//
// 9 tipos: 4 lembretes agendados (agua/treino/refeicao/pesagem) + 5
// eventos entre parceiros (fimDeRodada/parceiroPR/parceiroRanking/badge/
// parceiroRotina). agua/treino/fimDeRodada/parceiroRotina vem ligados por
// padrao — os outros exigem opt-in explicito.

export type TipoNotificacao =
  | "agua" | "treino" | "fimDeRodada" | "refeicao"
  | "pesagem" | "parceiroPR" | "parceiroRanking" | "badge"
  | "parceiroRotina";

export interface NotificacoesConfig {
  agua: { on: boolean; horarios: string[] }; // ["10:00","15:00","19:00"], granularidade de hora (cron externo so tem precisao horaria)
  treino: { on: boolean; horario: string }; // um unico horario, ex "17:00"
  fimDeRodada: { on: boolean };
  refeicao: { on: boolean };
  pesagem: { on: boolean };
  parceiroPR: { on: boolean };
  parceiroRanking: { on: boolean };
  badge: { on: boolean };
  parceiroRotina: { on: boolean }; // meta da rotina concluida / dia fechado pelo parceiro
  quietHours: { inicio: string; fim: string }; // "22:00" / "07:00" — cruza a meia-noite
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
  parceiroRotina: { on: true },
  quietHours: { inicio: "22:00", fim: "07:00" },
};

// Fallback pra contas antigas sem o campo (mesmo padrao que
// MINUTOS_ATIVOS_META_PADRAO em src/lib/atividades.ts) — nunca confie no
// campo cru de User.notificacoes, sempre passe por aqui. Espalha cada
// objeto aninhado explicitamente (nao um shallow-spread so no topo) pra um
// objeto salvo parcialmente nunca deixar um campo aninhado undefined.
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
    parceiroRotina: { ...NOTIFICACOES_PADRAO.parceiroRotina, ...(s.parceiroRotina || {}) },
    quietHours: { ...NOTIFICACOES_PADRAO.quietHours, ...(s.quietHours || {}) },
  };
}

// Tipos de evento entre parceiros — sujeitos ao debounce de 12h em
// sendToUser (push.ts). Lembretes agendados (agua/treino/refeicao/pesagem)
// NUNCA passam por esse debounce.
//
// parceiroRotina tambem fica DE FORA: o app existe justamente pra avisar
// cada meta concluida, varias vezes ao dia — quem segura o volume aqui e o
// teto diario de push.ts, nao um debounce de 12h que mataria tudo depois da
// primeira meta do dia.
export const TIPOS_DEBOUNCE_12H: TipoNotificacao[] = ["fimDeRodada", "parceiroPR", "parceiroRanking", "badge"];
