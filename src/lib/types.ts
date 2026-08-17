// Tipos do lado do cliente — espelham o formato devolvido pelas funções
// serverless em api/ (ver api/_lib/repo.ts para a fonte canônica do lado
// servidor). Mantidos deliberadamente enxutos: o cliente só enxerga o que
// publicUser()/as rotas devolvem como JSON, nunca o documento cru do banco.

export interface User {
  _id: string;
  email: string;
  nome: string;
  emoji: string;
  cor: string;
  sexo: "M" | "F";
  altura: string;
  idade: string;
  kcalMeta: number;
  waterMeta: number;
  proteinaMeta: number;
  minutosAtivosMeta: number;
  competitionId: string | null;
  createdAt: string;
}

export interface CompetitionHistoricoEntry {
  winner: string | null;
  date: string;
}

export interface Competition {
  _id: string;
  memberIds: string[];
  metaPontos: number;
  roundStart: string | null;
  historico: CompetitionHistoricoEntry[];
  createdAt: string;
}

export interface Invite {
  _id: string;
  fromUserId: string;
  fromNome: string;
  toEmail: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

// Navegação por pilha de telas (ver App.tsx) — screen/tab são strings livres
// de propósito (chaves de ROOTS/PUSHED), não vale a pena travar num union
// espalhado por ~15 arquivos.
export interface NavApi {
  push: (screen: string, params?: any) => void;
  pop: () => void;
  goTab: (tab: string) => void;
  goTo: (tab: string, screen?: string, params?: any) => void;
}
