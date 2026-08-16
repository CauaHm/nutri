import type { VercelRequest, VercelResponse } from "@vercel/node";
import { findSession, findUserById } from "./repo";
import type { User } from "./repo";

export const SESSION_COOKIE = "rm_session";

// VercelRequest ja vem com os cookies parseados em req.cookies, entao nao
// precisamos de nenhum equivalente a next/headers aqui.
export async function getSessionUser(req: VercelRequest): Promise<User | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const session = await findSession(token);
  if (!session) return null;
  return findUserById(session.userId);
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const maxAge = 60 * 60 * 24 * 30;
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`);
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// Autorizacao por prefixo de chave: dados pessoais so o dono escreve;
// dados da dupla (compras, receitas, recados, rodada) qualquer um dos dois
// membros da competicao ativa pode ler/escrever.
export function canWriteKey(user: User, key: string): boolean {
  if (key.startsWith(`${user._id}_`)) return true;
  if (user.competitionId && key.startsWith(`comp_${user.competitionId}_`)) return true;
  return false;
}

// Leitura tambem libera as chaves pessoais do parceiro de competicao ativa
// (e assim que o ranking e a composicao corporal comparam progresso) —
// escrita nunca, so o dono altera os proprios dados.
export function canReadKey(user: User, key: string, partnerId?: string | null): boolean {
  if (canWriteKey(user, key)) return true;
  if (partnerId && key.startsWith(`${partnerId}_`)) return true;
  return false;
}
