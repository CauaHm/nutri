// Rotina diaria/semanal — tarefas com horario, ofensiva (individual e da
// dupla) e revisao de domingo.
//
// O desenho todo sai do protocolo anti-procrastinacao que a gente montou:
//
//   - GATILHO FIXO: toda tarefa tem dia(s) da semana + janela de horario. O
//     app nunca pergunta "o que fazer agora" — ele responde.
//   - INTENCAO DE IMPLEMENTACAO (Gollwitzer): campo `ancora`, no formato
//     "Quando eu X, eu vou Y". E o que transfere o controle da forca de
//     vontade pro ambiente.
//   - REGRA DOS 5 MINUTOS: campo `minimo`. Concluir pelo minimo CONTA como
//     feito pra ofensiva (marcado a parte na UI). Comecar e a unica parte
//     dificil; um dia ruim nao pode virar um dia perdido.
//   - X NA PAREDE: o log e uma grade visivel, nao um numero escondido.
//   - NUNCA DUAS VEZES SEGUIDAS: um dia perdido e ruido estatistico e NAO
//     zera a ofensiva (ver calcOfensiva). Dois seguidos zeram.
//   - A RECOMPENSA NAO E CORTADA: tarefas com `essencial: false` (lazer,
//     jantar) existem no dia mas nao seguram o fechamento — reposicionar,
//     nao eliminar.
import { parseDate, formatDate, DIAS_PT } from "./dates";

// ---------------------------------------------------------------- tipos ---

export type RotinaCategoria = "foco" | "corpo" | "agua" | "mente" | "casa" | "base";

export interface RotinaTarefa {
  id: string;
  titulo: string;
  /** Dias da semana em que a tarefa vale — 0=Domingo .. 6=Sabado (mesmo indice de Date.getDay()). */
  dias: number[];
  /** Janela de horario "HH:MM". `fim` opcional: tarefa pontual em vez de bloco. */
  inicio: string;
  fim?: string;
  categoria: RotinaCategoria;
  /** "Quando eu X, eu vou Y" — a frase de intencao de implementacao. */
  ancora?: string;
  /** Versao minima aceita num dia ruim (a "regra dos 5 minutos"). */
  minimo?: string;
  /** Detalhe/regra da tarefa ("nada de reels", "500ml"). */
  nota?: string;
  /** Se false, a tarefa nao segura o fechamento do dia (lazer/recompensa). */
  essencial: boolean;
  /** Dispara push pro parceiro quando concluida. */
  avisar: boolean;
  /** De quem e a tarefa. "ambos" aparece pros dois. */
  dono: string | "ambos";
  ativo: boolean;
  ordem: number;
}

export type RotinaStatusEntrada = "feito" | "minimo" | "outro_horario" | "nao_feito";

export interface RotinaEntrada {
  status: RotinaStatusEntrada;
  /** ISO — quando foi marcado. */
  em: string;
  /** Preenchido na revisao de domingo. */
  motivo?: string;
  /** Preenchido quando o status e "outro_horario". */
  horarioReal?: string;
}

/** log[ "09/09/2026" ][ taskId ] = entrada */
export type RotinaLog = Record<string, Record<string, RotinaEntrada>>;

export interface RotinaConfig {
  /** Data BR em que a contagem dos 60 dias comecou. */
  inicio: string | null;
  /** Meta da ofensiva — 60 por padrao. */
  meta: number;
}

export const META_OFENSIVA_PADRAO = 60;

export const CONFIG_PADRAO: RotinaConfig = { inicio: null, meta: META_OFENSIVA_PADRAO };

export function mergeConfig(saved?: Partial<RotinaConfig> | null): RotinaConfig {
  const s = saved || {};
  return {
    inicio: typeof s.inicio === "string" ? s.inicio : null,
    meta: typeof s.meta === "number" && s.meta > 0 ? s.meta : META_OFENSIVA_PADRAO,
  };
}

// ------------------------------------------------------------ categorias ---

export const CATEGORIAS: Record<RotinaCategoria, { label: string; cor: string }> = {
  foco: { label: "Foco", cor: "#e040fb" },
  corpo: { label: "Corpo", cor: "#4ade80" },
  agua: { label: "Água", cor: "#22d3ee" },
  mente: { label: "Mente", cor: "#a855f7" },
  casa: { label: "Casa", cor: "#f59e0b" },
  base: { label: "Base", cor: "#60a5fa" },
};

export function corDaCategoria(c: RotinaCategoria): string {
  return (CATEGORIAS[c] || CATEGORIAS.base).cor;
}

// -------------------------------------------------------------- helpers ---

const PRESENCIAL = [2, 4, 5]; // ter, qui, sex — dias de fretado
const HOME = [1, 3]; // seg, qua
const UTEIS = [1, 2, 3, 4, 5];

export function minutosDe(hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function addDias(dataBR: string, n: number): string {
  const d = parseDate(dataBR);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

export function diaSemanaDe(dataBR: string): number {
  return parseDate(dataBR).getDay();
}

export function nomeDoDia(dataBR: string): string {
  return DIAS_PT[diaSemanaDe(dataBR)];
}

/** Tarefas ativas daquele dia da semana, visiveis pra `userId`, ja ordenadas por horario. */
export function tarefasDoDia(tarefas: RotinaTarefa[], dataBR: string, userId: string | null): RotinaTarefa[] {
  const dow = diaSemanaDe(dataBR);
  return tarefas
    .filter((t) => t.ativo && t.dias.includes(dow) && (t.dono === "ambos" || t.dono === userId))
    .sort((a, b) => minutosDe(a.inicio) - minutosDe(b.inicio) || a.ordem - b.ordem);
}

export function entradaDe(log: RotinaLog, dataBR: string, taskId: string): RotinaEntrada | null {
  return log[dataBR]?.[taskId] || null;
}

/** true quando `dataBR` e anterior ao dia em que a contagem comecou. */
export function antesDoInicio(dataBR: string, inicioBR?: string | null): boolean {
  if (!inicioBR) return false;
  return parseDate(dataBR).getTime() < parseDate(inicioBR).getTime();
}

/** "feito" e "minimo" contam como concluido — essa e a regra dos 5 minutos. */
export function contaComoFeito(e: RotinaEntrada | null): boolean {
  return !!e && (e.status === "feito" || e.status === "minimo" || e.status === "outro_horario");
}

// ------------------------------------------------------- status do dia ----

export type DiaStatus = "fechado" | "parcial" | "falhou" | "vazio" | "futuro";

export interface ResumoDia {
  data: string;
  status: DiaStatus;
  total: number;
  feitos: number;
  essenciaisTotal: number;
  essenciaisFeitos: number;
  /** 0..1 — fracao das essenciais concluidas. */
  progresso: number;
}

/**
 * Um dia so "fecha" quando TODAS as tarefas essenciais daquele dia foram
 * concluidas (inclusive pelo minimo). Tarefas nao-essenciais (lazer) entram
 * no total mostrado mas nunca seguram o fechamento.
 */
export function resumoDoDia(
  tarefas: RotinaTarefa[],
  log: RotinaLog,
  dataBR: string,
  userId: string | null,
  hojeBR: string,
  inicioBR?: string | null
): ResumoDia {
  // Dia anterior ao inicio da contagem nao existe pra rotina: nao e um dia
  // perdido, nao entra na revisao e nao pinta de vermelho em lugar nenhum.
  if (antesDoInicio(dataBR, inicioBR)) {
    return { data: dataBR, status: "vazio", total: 0, feitos: 0, essenciaisTotal: 0, essenciaisFeitos: 0, progresso: 0 };
  }
  const doDia = tarefasDoDia(tarefas, dataBR, userId);
  const feitos = doDia.filter((t) => contaComoFeito(entradaDe(log, dataBR, t.id))).length;
  const essenciais = doDia.filter((t) => t.essencial);
  const essenciaisFeitos = essenciais.filter((t) => contaComoFeito(entradaDe(log, dataBR, t.id))).length;
  const progresso = essenciais.length ? essenciaisFeitos / essenciais.length : 0;

  let status: DiaStatus;
  if (!doDia.length) status = "vazio";
  else if (parseDate(dataBR).getTime() > parseDate(hojeBR).getTime()) status = "futuro";
  else if (essenciais.length > 0 && essenciaisFeitos === essenciais.length) status = "fechado";
  else if (feitos > 0) status = "parcial";
  else status = "falhou";

  return { data: dataBR, status, total: doDia.length, feitos, essenciaisTotal: essenciais.length, essenciaisFeitos, progresso };
}

// ------------------------------------------------------------ ofensiva ----

/**
 * Um dia perdido a cada 7 fechados e perdoado (a regra "1 dia e ruido
 * estatistico, 2 seguidos e o comeco do fim"). O escudo NAO soma dia na
 * ofensiva — so evita que ela zere.
 */
const DIAS_ENTRE_ESCUDOS = 7;

export interface Ofensiva {
  /** Dias fechados na sequencia atual. */
  atual: number;
  /** Maior sequencia ja atingida. */
  recorde: number;
  /** Quantos dias perdidos foram perdoados na sequencia atual. */
  perdoados: number;
  /** true quando o dia de ONTEM foi perdido — perder hoje zera. */
  emRisco: boolean;
  /** Hoje ja esta fechado? */
  hojeFechado: boolean;
  /** Quantos dias faltam pra meta. */
  faltam: number;
  meta: number;
}

/** Reduz uma lista de resumos (hoje primeiro, indo pro passado) a um status binario. */
function statusBinario(r: ResumoDia): "fechado" | "falhou" | "vazio" {
  if (r.status === "vazio" || r.status === "futuro") return "vazio";
  return r.status === "fechado" ? "fechado" : "falhou";
}

/**
 * Percorre do dia mais recente pro passado. `dias[0]` deve ser o dia de hoje.
 * Hoje ainda aberto nao quebra nada: se hoje nao fechou, a contagem comeca de
 * ontem (voce ainda tem o dia inteiro pela frente).
 */
export function calcOfensiva(dias: ResumoDia[], meta: number): Ofensiva {
  const bin = dias.map(statusBinario);
  const hojeFechado = bin[0] === "fechado";

  // Ignora o dia de hoje quando ele ainda nao fechou — ele nao conta como
  // dia perdido enquanto o dia nao acabou.
  const inicio = hojeFechado || bin[0] === "vazio" ? 0 : 1;

  let atual = 0;
  let perdoados = 0;
  let streakNoUltimoEscudo = -DIAS_ENTRE_ESCUDOS;

  for (let i = inicio; i < bin.length; i++) {
    const s = bin[i];
    if (s === "vazio") continue;
    if (s === "fechado") {
      atual++;
      continue;
    }
    // dia perdido — procura o dia contavel anterior (mais pro passado)
    let j = i + 1;
    while (j < bin.length && bin[j] === "vazio") j++;
    const anterior = j < bin.length ? bin[j] : null;
    if (anterior === "falhou") break; // dois seguidos: zera
    if (atual - streakNoUltimoEscudo < DIAS_ENTRE_ESCUDOS) break; // escudo ainda em recarga
    streakNoUltimoEscudo = atual;
    perdoados++;
  }

  // Recorde: maior sequencia de dias fechados em todo o historico (sem
  // escudo — recorde e recorde).
  let recorde = 0;
  let corrida = 0;
  for (let i = bin.length - 1; i >= 0; i--) {
    if (bin[i] === "vazio") continue;
    if (bin[i] === "fechado") {
      corrida++;
      recorde = Math.max(recorde, corrida);
    } else corrida = 0;
  }
  recorde = Math.max(recorde, atual);

  // Em risco = o ultimo dia contavel ANTES de hoje foi perdido.
  let k = inicio === 0 ? 1 : 1;
  while (k < bin.length && bin[k] === "vazio") k++;
  const emRisco = !hojeFechado && k < bin.length && bin[k] === "falhou";

  return { atual, recorde, perdoados, emRisco, hojeFechado, faltam: Math.max(0, meta - atual), meta };
}

/**
 * Ofensiva da dupla: o dia so conta quando os DOIS fecharam. Reaproveita
 * calcOfensiva combinando os dois resumos dia a dia.
 */
export function combinarDias(a: ResumoDia[], b: ResumoDia[]): ResumoDia[] {
  return a.map((ra, i) => {
    const rb = b[i];
    if (!rb) return ra;
    const ambosVazios = ra.status === "vazio" && rb.status === "vazio";
    const algumFuturo = ra.status === "futuro" || rb.status === "futuro";
    const ambosFecharam = ra.status === "fechado" && rb.status === "fechado";
    const status: DiaStatus = ambosVazios ? "vazio" : algumFuturo ? "futuro" : ambosFecharam ? "fechado" : ra.feitos + rb.feitos > 0 ? "parcial" : "falhou";
    return {
      data: ra.data,
      status,
      total: ra.total + rb.total,
      feitos: ra.feitos + rb.feitos,
      essenciaisTotal: ra.essenciaisTotal + rb.essenciaisTotal,
      essenciaisFeitos: ra.essenciaisFeitos + rb.essenciaisFeitos,
      progresso: (ra.progresso + rb.progresso) / 2,
    };
  });
}

/** Serie de resumos, do dia `hojeBR` indo `n` dias pro passado (indice 0 = hoje). */
export function serieDeDias(
  tarefas: RotinaTarefa[],
  log: RotinaLog,
  hojeBR: string,
  userId: string | null,
  n: number,
  inicioBR?: string | null
): ResumoDia[] {
  const out: ResumoDia[] = [];
  for (let i = 0; i < n; i++) {
    const data = addDias(hojeBR, -i);
    if (antesDoInicio(data, inicioBR)) break;
    out.push(resumoDoDia(tarefas, log, data, userId, hojeBR, inicioBR));
  }
  return out;
}

// ------------------------------------------------- revisao de domingo -----

export interface PendenciaSemana {
  data: string;
  diaNome: string;
  tarefa: RotinaTarefa;
}

/**
 * Tudo que ficou sem marcacao nenhuma nos ultimos 7 dias (nao inclui hoje —
 * o domingo ainda esta acontecendo). E o que a revisao pergunta uma a uma.
 */
export function pendenciasDaSemana(
  tarefas: RotinaTarefa[],
  log: RotinaLog,
  hojeBR: string,
  userId: string | null,
  inicioBR?: string | null
): PendenciaSemana[] {
  const out: PendenciaSemana[] = [];
  for (let i = 1; i <= 7; i++) {
    const data = addDias(hojeBR, -i);
    if (antesDoInicio(data, inicioBR)) continue;
    for (const t of tarefasDoDia(tarefas, data, userId)) {
      if (!t.essencial) continue;
      if (!entradaDe(log, data, t.id)) out.push({ data, diaNome: nomeDoDia(data), tarefa: t });
    }
  }
  return out;
}

export interface PadraoRevisao {
  /** Tarefa que mais falhou na semana. */
  tarefaCritica: { titulo: string; vezes: number } | null;
  /** Dia da semana que mais falhou. */
  diaCritico: { dia: string; vezes: number } | null;
  /** Motivo mais repetido nas respostas da revisao. */
  motivoComum: { motivo: string; vezes: number } | null;
  totalPendencias: number;
  totalRecuperadas: number;
}

/** O "o que travou" do passo 10 — le a semana ja respondida e devolve o padrao. */
export function padraoDaSemana(
  tarefas: RotinaTarefa[],
  log: RotinaLog,
  hojeBR: string,
  userId: string | null,
  inicioBR?: string | null
): PadraoRevisao {
  const porTarefa = new Map<string, number>();
  const porDia = new Map<string, number>();
  const porMotivo = new Map<string, number>();
  let total = 0;
  let recuperadas = 0;

  for (let i = 1; i <= 7; i++) {
    const data = addDias(hojeBR, -i);
    if (antesDoInicio(data, inicioBR)) continue;
    for (const t of tarefasDoDia(tarefas, data, userId)) {
      if (!t.essencial) continue;
      const e = entradaDe(log, data, t.id);
      if (e?.status === "outro_horario") recuperadas++;
      if (contaComoFeito(e)) continue;
      total++;
      porTarefa.set(t.titulo, (porTarefa.get(t.titulo) || 0) + 1);
      const dia = nomeDoDia(data);
      porDia.set(dia, (porDia.get(dia) || 0) + 1);
      const motivo = e?.motivo?.trim();
      if (motivo) porMotivo.set(motivo, (porMotivo.get(motivo) || 0) + 1);
    }
  }

  const topo = (m: Map<string, number>) => {
    let melhorK: string | null = null;
    let melhorV = 0;
    m.forEach((v, k) => {
      if (v > melhorV) {
        melhorV = v;
        melhorK = k;
      }
    });
    return melhorK ? { k: melhorK as string, v: melhorV } : null;
  };

  const t = topo(porTarefa);
  const d = topo(porDia);
  const mo = topo(porMotivo);

  return {
    tarefaCritica: t ? { titulo: t.k, vezes: t.v } : null,
    diaCritico: d ? { dia: d.k, vezes: d.v } : null,
    motivoComum: mo ? { motivo: mo.k, vezes: mo.v } : null,
    totalPendencias: total,
    totalRecuperadas: recuperadas,
  };
}

// --------------------------------------------------------------- seed -----

let seq = 0;
function t(p: Omit<RotinaTarefa, "id" | "ordem" | "ativo" | "dono" | "avisar" | "essencial"> & Partial<Pick<RotinaTarefa, "essencial" | "avisar" | "dono">>): RotinaTarefa {
  seq++;
  return {
    id: `rt_${seq}`,
    ordem: seq,
    ativo: true,
    dono: "ambos",
    avisar: false,
    essencial: true,
    ...p,
  };
}

/**
 * Rotina do Caua, exatamente como ele descreveu. Serve de ponto de partida —
 * tudo e editavel dentro do app (a tela de configuracao mexe nos mesmos
 * campos). `dono: "ambos"` nas que os dois fazem; as especificas do fretado
 * ficam so pra ele ate a Rhebecca ajustar as dela.
 */
export function rotinaSeedCaua(userId: string): RotinaTarefa[] {
  seq = 0;
  return [
    // ---- terça / quinta / sexta (presencial, com fretado) ----
    t({
      titulo: "Acordar e se arrumar",
      dias: PRESENCIAL, inicio: "05:00", fim: "06:00", categoria: "base", dono: userId,
      ancora: "Quando o alarme tocar às 5:00, eu levanto na hora — sem soneca.",
      minimo: "Levantar e ir pro banheiro.",
    }),
    t({
      titulo: "Audiobook no fretado",
      dias: PRESENCIAL, inicio: "06:10", fim: "07:30", categoria: "mente", dono: userId,
      ancora: "Quando eu sentar no fretado, eu coloco o fone e abro o audiobook.",
      minimo: "5 minutos de audiobook.",
      nota: "Nada de TikTok, reels ou shorts. Vídeo longo pode.",
    }),
    t({
      titulo: "500 ml de água até as 7:30",
      dias: PRESENCIAL, inicio: "06:10", fim: "07:30", categoria: "agua", dono: userId,
      minimo: "Um copo cheio.",
    }),
    t({
      titulo: "Fretado da volta sem feed",
      dias: PRESENCIAL, inicio: "17:00", fim: "18:20", categoria: "mente", dono: userId,
      ancora: "Quando eu sentar no fretado da volta, eu abro o audiobook ou durmo.",
      nota: "Audiobook, dormir ou vídeo longo. Reels e shorts, não.",
      minimo: "5 minutos de audiobook.",
    }),

    // ---- segunda / quarta (home office) ----
    t({
      titulo: "Arrumar o quarto e lavar roupa",
      dias: HOME, inicio: "08:00", fim: "09:00", categoria: "casa", dono: userId,
      ancora: "Quando eu terminar o café, eu varro, passo pano e ponho a roupa pra lavar.",
      minimo: "Arrumar a cama e recolher o que está no chão.",
    }),
    t({
      titulo: "Esteira",
      dias: HOME, inicio: "14:10", fim: "15:00", categoria: "corpo", dono: userId,
      ancora: "Quando der 14:10, eu subo na esteira.",
      minimo: "10 minutos de caminhada.",
      avisar: true,
    }),
    t({
      titulo: "2 L de água até as 17:00",
      dias: HOME, inicio: "08:00", fim: "17:00", categoria: "agua", dono: userId,
    }),

    // ---- todos os dias úteis ----
    t({
      titulo: "2 L de água no trabalho",
      dias: PRESENCIAL, inicio: "08:00", fim: "17:00", categoria: "agua", dono: userId,
    }),
    t({
      titulo: "Bloco de estudo",
      dias: UTEIS, inicio: "18:30", fim: "21:00", categoria: "foco",
      ancora: "Quando eu chegar em casa e largar a mochila, eu sento e abro só o material de estudo.",
      minimo: "5 minutos. Só abrir e começar.",
      nota: "Celular em outro cômodo. Recuperação ativa, sem reler.",
      avisar: true,
    }),
    t({
      titulo: "Academia",
      dias: UTEIS, inicio: "21:00", fim: "23:00", categoria: "corpo",
      ancora: "Quando eu fechar o material de estudo, eu já saio pra academia.",
      minimo: "Ir e fazer um exercício.",
      avisar: true,
    }),
    t({
      titulo: "3 L de água no total",
      dias: UTEIS, inicio: "21:00", fim: "23:00", categoria: "agua",
    }),
    t({
      titulo: "Jantar e lazer",
      dias: UTEIS, inicio: "23:00", categoria: "base", essencial: false,
      nota: "A recompensa do dia. Aqui o feed e o jogo estão liberados.",
    }),

    // ---- sábado ----
    t({
      titulo: "Acordar às 8:00",
      dias: [6], inicio: "08:00", categoria: "base", dono: userId,
      minimo: "Levantar até as 9:00.",
    }),
    t({
      titulo: "Academia",
      dias: [6], inicio: "09:00", fim: "10:30", categoria: "corpo",
      minimo: "Ir e fazer um exercício.",
      avisar: true,
    }),
    t({
      titulo: "Limpar o quarto e lavar roupa",
      dias: [6], inicio: "11:00", fim: "12:30", categoria: "casa",
      minimo: "Arrumar a cama e recolher o que está no chão.",
    }),
    t({
      titulo: "Bloco de estudo",
      dias: [6], inicio: "14:00", fim: "17:00", categoria: "foco",
      ancora: "Quando eu terminar de arrumar o quarto, eu sento pra estudar.",
      minimo: "5 minutos. Só abrir e começar.",
      avisar: true,
    }),
    t({
      titulo: "Lazer",
      dias: [6], inicio: "17:00", categoria: "base", essencial: false,
      nota: "Resto do dia livre. Sem culpa.",
    }),

    // ---- domingo ----
    t({
      titulo: "Cardio",
      dias: [0], inicio: "09:00", fim: "10:00", categoria: "corpo",
      minimo: "20 minutos de caminhada.",
      avisar: true,
    }),
    t({
      titulo: "Revisão da semana",
      dias: [0], inicio: "19:00", fim: "19:30", categoria: "foco",
      ancora: "Quando eu terminar o almoço de domingo, eu abro a revisão da semana.",
      nota: "Duas perguntas: em que dias eu não fiz, e o que estava acontecendo.",
    }),
    t({
      titulo: "Lazer",
      dias: [0], inicio: "10:30", categoria: "base", essencial: false,
    }),
  ];
}
