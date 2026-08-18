// Hora/data local de Sao Paulo — funcoes Vercel rodam em UTC, mas todo o
// anti-spam (horario silencioso, "que horas sao pra disparar lembrete") e
// pensado em hora local de quem usa o app. Usa Intl.DateTimeFormat com
// timeZone fixo em vez de aritmetica manual de UTC-3 (Brasil nao observa
// horario de verao desde 2019, mas fixar via Intl e mais robusto e
// autoexplicativo do que codificar um offset numerico).

const TZ = "America/Sao_Paulo";

export function partesDataLocalSP(d: Date = new Date()): { y: number; m: number; dia: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  return {
    y: Number(parts.find((p) => p.type === "year")!.value),
    m: Number(parts.find((p) => p.type === "month")!.value),
    dia: Number(parts.find((p) => p.type === "day")!.value),
  };
}

// So pra bookkeeping interno do push_log (chave de "qual dia e hoje" pra
// contar o teto diario) — NUNCA compare isso com dado do app (waters/checks/
// mealLog/bc_historico), que e tudo DD/MM/AAAA. Pra isso, use diaLocalSP_BR.
export function diaLocalSP_ISO(d?: Date): string {
  const { y, m, dia } = partesDataLocalSP(d);
  return `${y}-${String(m).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// DD/MM/AAAA — mesmo formato que todayStr() do lado do cliente produz pra
// waters/checks/mealLog/bc_historico. E este que o cron usa pra checar "ja
// foi feito hoje".
export function diaLocalSP_BR(d?: Date): string {
  const { y, m, dia } = partesDataLocalSP(d);
  return `${String(dia).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function horaLocalSP(d: Date = new Date()): { hh: number; mm: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  return {
    hh: Number(parts.find((p) => p.type === "hour")?.value ?? "0"),
    mm: Number(parts.find((p) => p.type === "minute")?.value ?? "0"),
  };
}

// Mesma grafia usada em TreinoDia.dia (ver src/lib/defaults.ts/dates.ts) —
// precisa bater exatamente pra achar o treino programado de hoje no cron.
const DIAS_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function weekdayPTLocalSP(d: Date = new Date()): string {
  // Dia da semana de uma data-calendario e independente de fuso horario
  // uma vez que ja se tem Y/M/D — usa UTC so pra evitar qualquer conversao
  // de fuso adicional no proprio getDay().
  const { y, m, dia } = partesDataLocalSP(d);
  return DIAS_PT[new Date(Date.UTC(y, m - 1, dia)).getUTCDay()];
}

// Janela de horario silencioso cruza a meia-noite (22:00 -> 07:00), entao a
// comparacao inverte quando inicio > fim.
export function dentroDoQuietHours(cfg: { inicio: string; fim: string }, d: Date = new Date()): boolean {
  const { hh, mm } = horaLocalSP(d);
  const minutos = hh * 60 + mm;
  const [ih, im] = cfg.inicio.split(":").map(Number);
  const [fh, fm] = cfg.fim.split(":").map(Number);
  const inicio = ih * 60 + im;
  const fim = fh * 60 + fm;
  return inicio > fim ? minutos >= inicio || minutos < fim : minutos >= inicio && minutos < fim;
}
