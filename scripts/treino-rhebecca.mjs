// Treino da semana da Rhebecca (fonte: TREINO_SEMANA.pdf) no formato
// TreinoDia[] de src/lib/defaults.ts — a mesma coisa que o app grava na
// chave kv `${userId}_treino`.
//
// Os dados em si moram em api/_lib/treinoRhebecca.json: a rota
// api/admin/seed-treino.ts importa aquele arquivo direto, e este modulo le o
// mesmo JSON pra que o script de linha de comando e o endpoint nunca possam
// divergir.
//
// Sobre o campo `series` de cada exercicio: o proto e texto livre e
// getSeriesPlan() (src/lib/seriesPlan.ts) so cai na heuristica
// parseSetsFromProto() quando o exercicio NAO tem series definidas — e essa
// heuristica le o primeiro numero do proto, ou seja, "1×10 + 3×8" viraria 1
// serie so no treino ao vivo. Por isso todo exercicio ja vem com o plano
// explicito: 1 aquecimento a 60% do peso de trabalho (a mesma rampa de 1
// serie de RAMP_POR_QTD[1] no buildAutoSeriesPlan) + as series de trabalho em
// RIR 2 (reps in reserve), ou RIR 3 no dia de superior, porque ali o plano
// manda carga moderada e NAO progredir.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const arquivo = fileURLToPath(new URL("../api/_lib/treinoRhebecca.json", import.meta.url));

export const TREINO_RHEBECCA = JSON.parse(readFileSync(arquivo, "utf8"));
