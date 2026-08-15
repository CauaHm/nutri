import { findSession, findUserById } from "@/lib/repo";

export const SESSION_COOKIE = "rm_session";

export async function getSessionUser(cookieStore) {
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await findSession(token);
  if (!session) return null;
  return findUserById(session.userId);
}

export function setSessionCookie(res, token) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// Autorizacao por prefixo de chave: dados pessoais so o dono escreve;
// dados da dupla (compras, receitas, recados, rodada) qualquer um dos dois
// membros da competicao ativa pode ler/escrever.
export function canWriteKey(user, key) {
  if (key.startsWith(`${user._id}_`)) return true;
  if (user.competitionId && key.startsWith(`comp_${user.competitionId}_`)) return true;
  return false;
}

// Leitura tambem libera as chaves pessoais do parceiro de competicao ativa
// (e assim que o ranking e a composicao corporal comparam progresso) —
// escrita nunca, so o dono altera os proprios dados.
export function canReadKey(user, key, partnerId) {
  if (canWriteKey(user, key)) return true;
  if (partnerId && key.startsWith(`${partnerId}_`)) return true;
  return false;
}
