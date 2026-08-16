// Modulo de Composicao Corporal e Nutricao — calculos puros, sem estado.
// Tudo aqui e recalculado a partir do perfil + ultima medicao + config,
// nunca fica "preso" num valor salvo (pedido explicito: recalcular
// automaticamente sempre que peso/medidas/metas mudarem).

export type Sexo = "M" | "F";

export interface NafOption {
  key: string;
  label: string;
  desc: string;
  fator: number;
}

export const NAF_OPTIONS: NafOption[] = [
  { key: "sedentario", label: "Sedentário", desc: "pouco ou nenhum exercício", fator: 1.2 },
  { key: "leve", label: "Leve", desc: "1-3x por semana", fator: 1.375 },
  { key: "moderado", label: "Moderado", desc: "3-5x por semana", fator: 1.55 },
  { key: "muito_ativo", label: "Muito ativo", desc: "6-7x por semana", fator: 1.725 },
  { key: "atleta", label: "Atleta", desc: "treino intenso + trabalho físico", fator: 1.9 },
];

export const DEFICIT_MIN_RECOMENDADO = 15;
export const DEFICIT_MAX_RECOMENDADO = 25;

// % de gordura corporal — formula da Marinha dos EUA (medidas em cm).
export function calcGorduraNavy({
  sexo,
  altura,
  cintura,
  pescoco,
  quadril,
}: {
  sexo?: Sexo;
  altura: number | null;
  cintura: number | null;
  pescoco: number | null;
  quadril?: number | null;
}): number | null {
  if (!altura || !cintura || !pescoco) return null;
  if (sexo === "F") {
    if (!quadril) return null;
    const denom = 1.29579 - 0.35004 * Math.log10(cintura + quadril - pescoco) + 0.221 * Math.log10(altura);
    if (!denom) return null;
    return 495 / denom - 450;
  }
  const denom = 1.0324 - 0.19077 * Math.log10(cintura - pescoco) + 0.15456 * Math.log10(altura);
  if (!denom) return null;
  return 495 / denom - 450;
}

export function calcMassas(peso: number | null, pctGordura: number | null | undefined): { massaGorda: number | null; massaMagra: number | null } {
  if (!peso || pctGordura === null || pctGordura === undefined) return { massaGorda: null, massaMagra: null };
  const massaGorda = (peso * pctGordura) / 100;
  return { massaGorda, massaMagra: peso - massaGorda };
}

// TMB — Mifflin-St Jeor
export function calcTMB({ sexo, peso, altura, idade }: { sexo?: Sexo; peso: number | null; altura: number | null; idade: number | null }): number | null {
  if (!peso || !altura || !idade) return null;
  const base = 10 * peso + 6.25 * altura - 5 * idade;
  return sexo === "F" ? base - 161 : base + 5;
}

export function calcTDEE(tmb: number | null, nafKey?: string): number | null {
  if (!tmb) return null;
  const naf = NAF_OPTIONS.find((n) => n.key === nafKey) || NAF_OPTIONS[1];
  return tmb * naf.fator;
}

export const KCAL_POR_KG = 7700; // aprox. 1kg de gordura corporal
export const RITMO_SEMANAL_SEGURO_PCT = 1; // % do peso corporal por semana

export interface Objetivo {
  key: string;
  label: string;
}

export const OBJETIVOS: Objetivo[] = [
  { key: "perder", label: "Perder peso" },
  { key: "manter", label: "Manter peso" },
  { key: "ganhar", label: "Ganhar massa" },
];

export interface MetaAutomatica {
  tmb: number;
  tdee: number;
  caloriasDiarias: number;
  deficitPct: number;
  ritmoSemanal: number;
  proteinaMeta: number;
  waterMeta: number;
  ritmoAgressivo: boolean;
  diferencaKg: number | null;
}

// A partir de objetivo + peso meta + prazo, calcula tudo automaticamente:
// TDEE, calorias/dia (com deficit ou superavit pra bater a meta no prazo),
// proteina e agua do dia. Isso e o que preenche as metas da conta — nao se
// digita mais kcal/agua/proteina na mao.
export function calcMetaAutomatica({
  sexo,
  altura,
  idade,
  pesoAtual,
  naf,
  objetivo,
  pesoMeta,
  prazoSemanas,
  proteinaGkg,
}: {
  sexo?: Sexo;
  altura: number | null;
  idade: number | null;
  pesoAtual: number | null;
  naf?: string;
  objetivo?: string;
  pesoMeta?: string | number | null;
  prazoSemanas?: string | number | null;
  proteinaGkg?: string | number | null;
}): MetaAutomatica | null {
  const tmb = calcTMB({ sexo, peso: pesoAtual, altura, idade });
  const tdee = calcTDEE(tmb, naf);
  if (!tmb || !tdee) return null;

  let ajusteDiario = 0;
  let ritmoSemanal = 0;
  const prazo = Number(prazoSemanas) || 0;
  const meta = Number(pesoMeta) || 0;

  if (objetivo !== "manter" && pesoAtual && meta && prazo > 0) {
    const diffKg = meta - pesoAtual;
    ritmoSemanal = diffKg / prazo;
    ajusteDiario = (diffKg * KCAL_POR_KG) / prazo / 7;
  }

  const caloriasDiarias = Math.max(1000, Math.round(tdee + ajusteDiario));
  const deficitPct = Math.round(((tdee - caloriasDiarias) / tdee) * 100);
  const proteinaMeta = Math.round((pesoAtual || 0) * (Number(proteinaGkg) || 2.1));
  const bumpAgua = naf === "muito_ativo" || naf === "atleta" ? 0.5 : 0;
  const waterMeta = Math.max(2, Math.round(((pesoAtual || 0) * 0.035 + bumpAgua) * 2) / 2);
  const ritmoPctPeso = pesoAtual ? (Math.abs(ritmoSemanal) / pesoAtual) * 100 : 0;

  return {
    tmb, tdee, caloriasDiarias, deficitPct, ritmoSemanal,
    proteinaMeta, waterMeta,
    ritmoAgressivo: ritmoPctPeso > RITMO_SEMANAL_SEGURO_PCT,
    diferencaKg: pesoAtual && meta ? Math.abs(pesoAtual - meta) : null,
  };
}

export interface Macros {
  proteinaG: number;
  proteinaKcal: number;
  gorduraG: number;
  gorduraKcal: number;
  carboG: number;
  carboKcal: number;
}

export function calcMacros(peso: number | null, caloriasDiarias: number | null, proteinaGkg: number, gorduraGkg: number): Macros | null {
  if (!peso || !caloriasDiarias) return null;
  const proteinaG = peso * proteinaGkg;
  const proteinaKcal = proteinaG * 4;
  const gorduraG = peso * gorduraGkg;
  const gorduraKcal = gorduraG * 9;
  const carboKcal = Math.max(0, caloriasDiarias - proteinaKcal - gorduraKcal);
  const carboG = carboKcal / 4;
  return { proteinaG, proteinaKcal, gorduraG, gorduraKcal, carboG, carboKcal };
}

// --- Plano de refeicoes ---------------------------------------------------

interface FoodDbItem {
  nome: string;
  kcal100: number;
  prot100: number;
}

const FOOD_DB: { proteina: FoodDbItem[]; carbo: FoodDbItem[] } = {
  proteina: [
    { nome: "Peito de frango grelhado", kcal100: 165, prot100: 31 },
    { nome: "Ovo inteiro", kcal100: 155, prot100: 13 },
    { nome: "Whey protein", kcal100: 400, prot100: 80 },
    { nome: "Tilápia", kcal100: 128, prot100: 26 },
    { nome: "Patinho moído (5% gordura)", kcal100: 172, prot100: 26 },
  ],
  carbo: [
    { nome: "Arroz branco cozido", kcal100: 130, prot100: 2.7 },
    { nome: "Batata doce cozida", kcal100: 86, prot100: 1.6 },
    { nome: "Aveia em flocos", kcal100: 389, prot100: 17 },
    { nome: "Pão francês", kcal100: 300, prot100: 8 },
    { nome: "Tapioca (goma hidratada)", kcal100: 240, prot100: 0.2 },
  ],
};

export interface OpcaoRefeicao {
  nome: string;
  itens: { alimento: string; gramas: number }[];
  kcal: number;
  proteina: number;
}

function gerarOpcoesRefeicao(kcalAlvo: number, proteinaAlvoG: number): OpcaoRefeicao[] {
  if (!kcalAlvo || kcalAlvo <= 0) return [];
  const { proteina, carbo } = FOOD_DB;
  const opcoes: OpcaoRefeicao[] = [];
  for (let i = 0; i < 3; i++) {
    const p = proteina[i % proteina.length];
    const c = carbo[i % carbo.length];
    const protGramas = Math.max(30, Math.round((proteinaAlvoG * 0.85) / (p.prot100 / 100)));
    const kcalDaProteina = (protGramas * p.kcal100) / 100;
    const kcalRestante = Math.max(50, kcalAlvo - kcalDaProteina);
    const carbGramas = Math.max(20, Math.round(kcalRestante / (c.kcal100 / 100)));
    const protDoCarbo = (carbGramas * c.prot100) / 100;
    opcoes.push({
      nome: `${p.nome} + ${c.nome}`,
      itens: [
        { alimento: p.nome, gramas: protGramas },
        { alimento: c.nome, gramas: carbGramas },
      ],
      kcal: Math.round(kcalDaProteina + kcalRestante),
      proteina: Math.round((protGramas * p.prot100) / 100 + protDoCarbo),
    });
  }
  return opcoes;
}

export interface RefeicaoSlot {
  key: string;
  nome: string;
  emoji: string;
  pct: number;
}

export const REFEICAO_SLOTS: RefeicaoSlot[] = [
  { key: "cafe", nome: "Café da Manhã", emoji: "☀️", pct: 0.25 },
  { key: "lancheM", nome: "Lanche da Manhã", emoji: "🍎", pct: 0.1 },
  { key: "almoco", nome: "Almoço", emoji: "🍽️", pct: 0.3 },
  { key: "preTreino", nome: "Pré-Treino", emoji: "⚡", pct: 0.15 },
  { key: "jantar", nome: "Jantar", emoji: "🌙", pct: 0.2 },
];

export interface PlanoRefeicaoSlot extends RefeicaoSlot {
  kcalAlvo: number;
  protAlvo: number;
  opcoes: OpcaoRefeicao[];
}

export function gerarPlanoRefeicoes(caloriasDiarias: number | null, proteinaDiariaG: number | null): PlanoRefeicaoSlot[] {
  if (!caloriasDiarias || !proteinaDiariaG) return [];
  return REFEICAO_SLOTS.map((slot) => {
    const kcalAlvo = Math.round(caloriasDiarias * slot.pct);
    const protAlvo = Math.round(proteinaDiariaG * slot.pct);
    return { ...slot, kcalAlvo, protAlvo, opcoes: gerarOpcoesRefeicao(kcalAlvo, protAlvo) };
  });
}

// --- Comparacao semanal ---------------------------------------------------
// Uma medicao "representa" a semana em que foi feita (semana = segunda a
// domingo). Se a pessoa registrar mais de uma vez na mesma semana, vale a
// mais recente. Isso da o check-in semanal pedido sem inventar numero
// nenhum — so organiza o que a pessoa de fato registrou.

// Entrada de historico de medicoes — campos de medida sao strings livres
// vindas de inputs controlados (podem ser "" quando nao preenchidos).
export interface MedicaoEntry {
  id: number;
  date: string;
  [key: string]: any;
}

const CAMPOS_COMPARAVEIS = ["peso", "cintura", "pescoco", "quadril", "ombros", "bunda", "braco", "coxa", "panturrilha"];

export function snapshotsPorSemana(historico: MedicaoEntry[], getWeekStart: (s: string) => string): { semana: string; entry: MedicaoEntry }[] {
  const porSemana: Record<string, MedicaoEntry> = {};
  [...historico].sort((a, b) => a.id - b.id).forEach((h) => {
    const wk = getWeekStart(h.date);
    porSemana[wk] = h; // mais recente da semana sobrescreve
  });
  return Object.entries(porSemana)
    .map(([semana, entry]) => ({ semana, entry }))
    .sort((a, b) => b.semana.localeCompare(a.semana));
}

const num = (v: any): number | null => (v === "" || v === null || v === undefined ? null : Number(v));

// Direcao "boa" de uma metrica: compara pra onde a meta aponta (subir ou
// descer a partir do valor anterior) com pra onde o valor de fato foi.
function direcaoBoa(anterior: number | null, atual: number | null, meta: any): boolean | null {
  if (meta === null || meta === undefined || meta === "" || anterior === null || atual === null) return null;
  const alvo = Math.sign(Number(meta) - anterior);
  const foi = Math.sign(atual - anterior);
  if (foi === 0) return null;
  if (alvo === 0) return null;
  return alvo === foi;
}

export interface ComparacaoCampo {
  campo: string;
  anterior: number | null;
  atual: number | null;
  delta: number;
  boa: boolean | null;
}

export function compararSemanas(atualEntry: MedicaoEntry | null | undefined, anteriorEntry: MedicaoEntry | null | undefined, metas: Record<string, any> | undefined): ComparacaoCampo[] | null {
  if (!atualEntry || !anteriorEntry) return null;
  const campos = CAMPOS_COMPARAVEIS.filter((c) => num(atualEntry[c]) !== null && num(anteriorEntry[c]) !== null);
  return campos.map((campo) => {
    const anterior = num(anteriorEntry[campo]);
    const atual = num(atualEntry[campo]);
    const delta = Math.round(((atual as number) - (anterior as number)) * 10) / 10;
    return { campo, anterior, atual, delta, boa: direcaoBoa(anterior, atual, metas?.[campo]) };
  });
}

// --- Comparativo biologico entre duas pessoas -----------------------------
// Corpos de homens e mulheres tem faixas saudaveis de % de gordura bem
// diferentes — comparar o numero cru dos dois lado a lado engana. Aqui cada
// pessoa e classificada dentro da propria faixa (referencia geral, tipo
// American Council on Exercise), pra dar um comparativo justo.

interface FaixaGordura {
  max: number;
  label: string;
}

const FAIXAS_GORDURA: Record<Sexo, FaixaGordura[]> = {
  M: [
    { max: 5, label: "Essencial" },
    { max: 13, label: "Atlético" },
    { max: 17, label: "Fitness" },
    { max: 24, label: "Aceitável" },
    { max: Infinity, label: "Acima da faixa" },
  ],
  F: [
    { max: 13, label: "Essencial" },
    { max: 20, label: "Atlético" },
    { max: 24, label: "Fitness" },
    { max: 31, label: "Aceitável" },
    { max: Infinity, label: "Acima da faixa" },
  ],
};

export function classificarGordura(sexo: Sexo | undefined, pct: number | null | undefined): string | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  const faixas = FAIXAS_GORDURA[sexo === "F" ? "F" : "M"];
  const faixa = faixas.find((f) => pct <= f.max)!;
  return faixa.label;
}
