export interface MedidaLabel {
  key: string;
  label: string;
}

export const MEDIDAS_LABEL: MedidaLabel[] = [
  { key: "ombros", label: "Ombros" },
  { key: "cintura", label: "Cintura" },
  { key: "quadril", label: "Quadril" },
  { key: "bunda", label: "Bunda" },
  { key: "braco", label: "Braço" },
  { key: "coxa", label: "Coxa" },
  { key: "panturrilha", label: "Panturrilha" },
];

export type MedidasMap = Record<string, string>;

export function defaultMedidas(): MedidasMap {
  return Object.fromEntries(MEDIDAS_LABEL.map((m) => [m.key, ""]));
}
export function defaultMedidasMetas(): MedidasMap {
  return Object.fromEntries(MEDIDAS_LABEL.map((m) => [m.key, ""]));
}

export interface RefeicaoConfig {
  id: string;
  nome: string;
  emoji: string;
  horario: string;
  kcalAlvo: number;
  itens: string[];
}

// Refeicoes: cada usuario tem sua propria lista de refeicoes do dia,
// pode adicionar/remover/renomear quantas quiser (café, pré-treino,
// pós-treino, ceia...). "itens" sao so sugestoes de opcoes, nao obrigam nada.
export function defaultRefeicoes(): RefeicaoConfig[] {
  return [
    { id: "r1", nome: "Café da Manhã", emoji: "☀️", horario: "09:00", kcalAlvo: 350, itens: ["Panqueca de whey (whey 30g + aveia 40g + 1 ovo + canela)", "Ovo mexido (2-3 ovos) + pão francês + requeijão zero", "Iogurte zero 200g + aveia 30g + fruta"] },
    { id: "r2", nome: "Almoço", emoji: "🍽️", horario: "12:30", kcalAlvo: 500, itens: ["Frango desfiado 150g + arroz 50g (ou batata 150g) + salada", "Frango empanado fit (aveia) + arroz ou batata + salada"] },
    { id: "r3", nome: "Lanche", emoji: "🥪", horario: "17:30", kcalAlvo: 250, itens: ["Rap 10 fit (2un) + frango desfiado 80g + requeijão zero", "Shake: whey 1 scoop + 200ml leite ou água"] },
    { id: "r4", nome: "Jantar", emoji: "🌙", horario: "20:00", kcalAlvo: 370, itens: ["Omelete: 3 ovos + frango desfiado 80g + tomate + requeijão zero", "Frango desfiado 120g + salada completa"] },
    { id: "r5", nome: "Ceia", emoji: "🌛", horario: "22:00", kcalAlvo: 130, itens: ["Iogurte zero 200g", "Whey 1 scoop com água"] },
  ];
}

export interface CompraItem {
  id: string;
  item: string;
  qtd: string;
  preco: number;
  cat: string;
}

export function defaultCompras(): CompraItem[] {
  return [
    { id: "c1", item: "Peito de frango", qtd: "1 kg", preco: 12, cat: "Proteína" },
    { id: "c2", item: "Ovos", qtd: "18 unidades", preco: 12, cat: "Proteína" },
    { id: "c3", item: "Sardinha em lata", qtd: "3 latas", preco: 9, cat: "Proteína" },
    { id: "c4", item: "Iogurte zero", qtd: "4 potes (200g cada)", preco: 12, cat: "Proteína" },
    { id: "c5", item: "Pão francês", qtd: "500g (~10 unid.)", preco: 5, cat: "Carboidrato" },
    { id: "c6", item: "Arroz", qtd: "1 kg", preco: 4, cat: "Carboidrato" },
    { id: "c7", item: "Batata", qtd: "1 kg", preco: 4, cat: "Carboidrato" },
    { id: "c8", item: "Farinha de aveia", qtd: "500g", preco: 8, cat: "Carboidrato" },
    { id: "c9", item: "Alface", qtd: "1 pé", preco: 3, cat: "Vegetal" },
    { id: "c10", item: "Tomate", qtd: "500g", preco: 4, cat: "Vegetal" },
    { id: "c11", item: "Cenoura", qtd: "500g", preco: 3, cat: "Vegetal" },
    { id: "c12", item: "Pepino", qtd: "2 unidades", preco: 3, cat: "Vegetal" },
    { id: "c13", item: "Extrato de tomate", qtd: "1 lata pequena", preco: 3, cat: "Tempero" },
    { id: "c14", item: "Molho de tomate s/ açúcar", qtd: "1 caixinha", preco: 3, cat: "Tempero" },
  ];
}

export interface Receita {
  id: string;
  nome: string;
  tempo: string;
  custo: string;
  ing: string[];
  passos: string[];
  dica: string;
}

export function defaultReceitas(): Receita[] {
  return [
    { id: "rc1", nome: "🍕 Pizza de Frigideira", tempo: "10 min", custo: "~R$4", ing: ["2 pães franceses", "Extrato de tomate + orégano + alho", "50g queijo muçarela", "Frango desfiado"], passos: ["Corta o pão ao meio", "Espalha molho com alho e orégano", "Coloca frango e queijo", "Tampa a frigideira em fogo baixo por 5 min", "Queijo derreteu? Pronto!"], dica: "Usa o frango do meal prep!" },
    { id: "rc2", nome: "🥟 Pastel de Forno", tempo: "25 min", custo: "~R$5 (6 unid.)", ing: ["2 xíc. farinha de trigo", "1 col. margarina", "Sal + água morna", "Recheio: frango+queijo"], passos: ["Mistura farinha + sal + margarina + água", "Descansa 10 min", "Abre fina, corta em retângulos", "Coloca recheio, fecha com garfo", "Forno 200°C por 15-20 min"], dica: "Faz em lote! Guarda na geladeira." },
    { id: "rc3", nome: "🫔 Esfirra de Massa de Frango", tempo: "30 min", custo: "~R$6 (8 unid.)", ing: ["300g peito de frango cru", "Sal, alho, ervas", "Queijo para rechear"], passos: ["Processa o frango cru até virar pasta", "Tempera com sal, alho e ervas", "Abre porções finas em papel manteiga", "Recheio com queijo, fecha", "Forno 200°C por ~20 min"], dica: "A MASSA é o frango! Alta proteína." },
    { id: "rc4", nome: "🥞 Panqueca Doce de Banana", tempo: "10 min", custo: "~R$2", ing: ["1 banana amassada", "1 ovo", "2 col. aveia", "Canela"], passos: ["Amassa a banana", "Mistura ovo + aveia + canela", "Frite em frigideira sem óleo", "Come com iogurte zero"], dica: "Doce natural da banana — sem açúcar!" },
    { id: "rc5", nome: "🍳 Bolinho de Caneca", tempo: "5 min", custo: "~R$2", ing: ["1 ovo", "2 col. aveia", "1 banana OU 1 col. cacau", "Canela + sal"], passos: ["Mistura tudo numa caneca", "Microondas por 2-3 minutos", "Come direto na caneca!"], dica: "Doce urgente. Funciona!" },
    { id: "rc6", nome: "🍝 Macarrão Cremoso", tempo: "20 min", custo: "~R$5", ing: ["200g macarrão", "150g frango desfiado", "3 col. requeijão zero", "Alho, azeite, pouco leite"], passos: ["Cozinha macarrão al dente", "Refoga alho, adiciona frango", "Coloca requeijão + leite, mexe", "Mistura com o macarrão"], dica: "Requeijão zero deixa cremoso sem pesar!" },
  ];
}

export interface Exercicio {
  id?: number;
  nome: string;
  proto: string;
  foco: string;
  nota: string;
}

export interface TreinoDia {
  dia: string;
  tag: string;
  emoji: string;
  isCardio: boolean;
  cardio: string;
  info: string;
  exercicios: Exercicio[];
}

// Ponto de partida de quem acabou de criar conta — bem enxuto de propósito;
// a pessoa monta o próprio treino do jeito que quiser depois.
export function defaultTreinoGenerico(): TreinoDia[] {
  return [
    { dia: "Segunda", tag: "Treino A", emoji: "🏋️", isCardio: false, cardio: "30 min cardio", info: "", exercicios: [] },
  ];
}
