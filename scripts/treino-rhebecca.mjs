// Treino da semana da Rhebecca (fonte: TREINO_SEMANA.pdf) no formato
// TreinoDia[] de src/lib/defaults.ts — a mesma coisa que o app grava na
// chave kv `${userId}_treino`.
//
// Sobre `series`: o proto e texto livre e getSeriesPlan() (src/lib/seriesPlan.ts)
// so cai na heuristica parseSetsFromProto() quando o exercicio NAO tem series
// definidas — e essa heuristica le o primeiro numero do proto, ou seja,
// "1×10 + 3×8" viraria 1 serie so no treino ao vivo. Por isso todo exercicio
// aqui ja vem com o plano explicito: 1 aquecimento em rampa + as series de
// trabalho.

// Aquecimento: 60% do peso de trabalho e a mesma rampa de 1 serie usada em
// RAMP_POR_QTD[1] no buildAutoSeriesPlan().
const aquec = (reps) => ({ tipo: "aquecimento", reps, percentual: 60 });

// Series de trabalho em RIR (reps in reserve). rir 2 = pesado/progressao de
// carga; rir 3 no superior porque o plano manda carga moderada e NAO progredir.
const trabalho = (qtd, reps, rir = 2) => Array.from({ length: qtd }, () => ({ tipo: "reserva", rir, reps }));

const pesado = (reps = "8") => [aquec("10"), ...trabalho(3, reps)];

export const TREINO_RHEBECCA = [
  {
    dia: "Segunda",
    tag: "Glúteos A",
    emoji: "🍑",
    isCardio: false,
    cardio: "40 min esteira em casa",
    info: "1×10 aquecimento + 3×8 pesado · Progressão de carga",
    exercicios: [
      { id: 1, nome: "Elevação Pélvica", proto: "1×10 + 3×8", foco: "Glúteo Máximo ⭐⭐⭐", nota: "Pés no meio, pontas pra fora. Força no glúteo, não no calcanhar.", series: pesado() },
      { id: 2, nome: "Cadeira Abdutora", proto: "1×10 + 3×8", foco: "Glúteo Médio ⭐⭐⭐", nota: "Aquec reto → Série 1 reto → Séries 2 e 3 inclinada.", series: pesado() },
      { id: 3, nome: "Kickback na Polia", proto: "1×10 + 3×8 cada", foco: "Glúteo Máximo ⭐⭐", nota: "Perna de apoio flexionada, chuta pra fora.", series: [aquec("10 cada"), ...trabalho(3, "8 cada")] },
      { id: 4, nome: "Abdução Lateral na Polia", proto: "1×10 + 3×8 cada", foco: "Glúteo Médio ⭐⭐⭐", nota: "Cabo no tornozelo, levanta a perna pra fora mantendo reta.", series: [aquec("10 cada"), ...trabalho(3, "8 cada")] },
      { id: 5, nome: "Cadeira Adutora", proto: "1×10 + 3×8", foco: "Parte Interna da Coxa", nota: "Joelhos na lateral. Espremer as coxas — relaxa o glúteo.", series: pesado() },
    ],
  },
  {
    dia: "Terça",
    tag: "Pernas",
    emoji: "🦵",
    isCardio: false,
    cardio: "40 min esteira em casa",
    info: "1×10 aquecimento + 3×8 pesado · Progressão de carga",
    exercicios: [
      { id: 6, nome: "Agachamento no Smith", proto: "1×10 + 3×8", foco: "Quadríceps + Glúteo", nota: "Barra guiada, desce até 90°. Postura firme.", series: pesado() },
      { id: 7, nome: "Leg Press 45°", proto: "1×10 + 3×8", foco: "Quadríceps + Glúteo Máximo", nota: "Pés além do quadril, pontas pra fora.", series: pesado() },
      { id: 8, nome: "Stiff com Halteres", proto: "1×10 + 3×8", foco: "Posterior + Glúteo Máximo", nota: "Empina o glúteo pra trás, halteres perto da perna.", series: pesado() },
      { id: 9, nome: "Cadeira Extensora", proto: "1×10 + 3×8", foco: "Quadríceps", nota: "Joelho fora do banco. Controle e postura.", series: pesado() },
      { id: 10, nome: "Cadeira Flexora", proto: "1×10 + 3×8", foco: "Posterior de Coxa", nota: "Rolo bem perto do tornozelo. Joelho fora do banco.", series: pesado() },
      { id: 11, nome: "Panturrilha na Máquina", proto: "3×15", foco: "Panturrilha", nota: "Amplitude completa.", series: trabalho(3, "15") },
    ],
  },
  {
    dia: "Quarta",
    tag: "Glúteos B",
    emoji: "🍑",
    isCardio: false,
    cardio: "40 min esteira em casa",
    info: "1×10 aquecimento + 3×8 pesado · Progressão de carga",
    exercicios: [
      { id: 12, nome: "Elevação Pélvica", proto: "1×10 + 3×8", foco: "Glúteo Máximo ⭐⭐⭐", nota: "Sobe apertando no topo, segura 1 seg.", series: pesado() },
      { id: 13, nome: "Cadeira Abdutora (volume)", proto: "1×10 + 3×8", foco: "Glúteo Médio ⭐⭐⭐", nota: "Mais volume. Glúteo médio é o que alarga o quadril!", series: pesado() },
      { id: 14, nome: "Kickback na Polia", proto: "1×10 + 3×8 cada", foco: "Glúteo Máximo ⭐⭐", nota: "Extensão cruzada também.", series: [aquec("10 cada"), ...trabalho(3, "8 cada")] },
      { id: 15, nome: "Abdução Lateral na Polia", proto: "1×10 + 3×8 cada", foco: "Glúteo Médio ⭐⭐⭐", nota: "Cabo no tornozelo, levanta a perna pra fora mantendo reta.", series: [aquec("10 cada"), ...trabalho(3, "8 cada")] },
      { id: 16, nome: "Cadeira Adutora", proto: "1×10 + 3×8", foco: "Parte Interna da Coxa", nota: "Vai ficando mais fácil a cada semana!", series: pesado() },
    ],
  },
  {
    dia: "Quinta",
    tag: "Cardio",
    emoji: "🏃",
    isCardio: true,
    cardio: "1 hora de esteira em casa",
    info: "",
    exercicios: [],
  },
  {
    dia: "Sexta",
    tag: "Superior",
    emoji: "💪",
    isCardio: false,
    cardio: "40 min esteira em casa",
    info: "3×12 · Carga moderada — NÃO progredir · Tônus, não crescimento",
    exercicios: [
      { id: 17, nome: "Remada Articulada", proto: "3×12", foco: "Meio das Costas (definição)", nota: "Costas retas, puxa até o abdômen. Carga moderada.", series: trabalho(3, "12", 3) },
      { id: 18, nome: "Remada Baixa Cabo", proto: "3×12", foco: "Meio das Costas (definição)", nota: "Peito estufado, escápula travada.", series: trabalho(3, "12", 3) },
      { id: 19, nome: "Pulldown (pegada fechada)", proto: "3×12", foco: "Costas (sem alargar)", nota: "Pegada fechada! Puxa até a cintura.", series: trabalho(3, "12", 3) },
      { id: 20, nome: "Tríceps na Máquina", proto: "3×12", foco: "Tríceps (2/3 do braço)", nota: "Cotovelos fixos. Braços finos vêm daqui!", series: trabalho(3, "12", 3) },
      { id: 21, nome: "Rosca com Halteres", proto: "3×12", foco: "Bíceps (definição)", nota: "Sobe contraindo, desce alongando ao máximo.", series: trabalho(3, "12", 3) },
      { id: 22, nome: "Scott Máquina", proto: "3×12", foco: "Bíceps (definição)", nota: "Cotovelo fixo. Desce e sobe controlado.", series: trabalho(3, "12", 3) },
    ],
  },
  {
    dia: "Sábado",
    tag: "Glúteos + Pernas C",
    emoji: "🔥",
    isCardio: false,
    cardio: "40 min esteira em casa",
    info: "1×10 aquecimento + 3×8 pesado · Progressão de carga",
    exercicios: [
      { id: 23, nome: "Elevação Pélvica", proto: "1×10 + 3×8", foco: "Glúteo Máximo ⭐⭐⭐", nota: "Mais pesado que segunda se conseguir!", series: pesado() },
      { id: 24, nome: "Cadeira Abdutora", proto: "1×10 + 3×8", foco: "Glúteo Médio ⭐⭐⭐", nota: "Aquec reto → reto → 2x inclinada.", series: pesado() },
      { id: 25, nome: "Leg Press 45° (pé alto e largo)", proto: "1×10 + 3×8", foco: "Glúteo Máximo + Médio", nota: "Pés bem altos E mais abertos na plataforma.", series: pesado() },
      { id: 26, nome: "Stiff com Halteres", proto: "1×10 + 3×8", foco: "Posterior + Glúteo Máximo", nota: "Empina o glúteo pra trás, halteres perto da perna.", series: pesado() },
      { id: 27, nome: "Cadeira Adutora", proto: "1×10 + 3×8", foco: "Parte Interna da Coxa", nota: "Fecha o dia equilibrando com a abdutora.", series: pesado() },
    ],
  },
  {
    dia: "Domingo",
    tag: "Cardio",
    emoji: "🏃",
    isCardio: true,
    cardio: "1 hora de esteira em casa",
    info: "",
    exercicios: [],
  },
];
