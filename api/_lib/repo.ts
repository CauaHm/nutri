import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, ObjectId } from "./db";
import { NOTIFICACOES_PADRAO, type NotificacoesConfig } from "./notificacoes";

export interface User {
  _id: string;
  email: string;
  passwordHash: string;
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
  // Opcional — contas criadas antes desse campo existir nao tem. Nunca leia
  // isso cru; sempre passe por mergeNotificacoes() (api/_lib/notificacoes.ts).
  notificacoes?: NotificacoesConfig;
}

export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  _id: string;
  userId: string;
  expiresAt: string;
}

export interface PasswordReset {
  _id: string; // o proprio token — mesma convencao de Session._id
  userId: string;
  expiresAt: string;
}

export interface Invite {
  _id: string;
  fromUserId: string;
  fromNome: string;
  toEmail: string;
  status: "pending" | "accepted" | "declined";
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

const SESSION_DAYS = 30;
const norm = (email?: string | null): string => String(email || "").trim().toLowerCase();

// ---- Usuarios -------------------------------------------------------

export async function createUser({ email, senha, nome }: { email: string; senha: string; nome?: string }): Promise<{ user?: User; error?: string }> {
  const db = await getDb();
  const users = db.collection<User>("users");
  const existing = await users.findOne({ email: norm(email) });
  if (existing) return { error: "email_em_uso" };

  const passwordHash = await bcrypt.hash(senha, 10);
  const _id = new ObjectId().toString();
  const doc: User = {
    _id,
    email: norm(email),
    passwordHash,
    nome: nome || norm(email).split("@")[0],
    emoji: "🙂",
    cor: "#e040fb",
    sexo: "M",
    altura: "",
    idade: "",
    kcalMeta: 2000,
    waterMeta: 3,
    proteinaMeta: 130,
    minutosAtivosMeta: 45,
    competitionId: null,
    createdAt: new Date().toISOString(),
    notificacoes: NOTIFICACOES_PADRAO,
  };
  await users.insertOne(doc);
  return { user: doc };
}

export async function verifyLogin({ email, senha }: { email: string; senha: string }): Promise<{ user?: User; error?: string }> {
  const db = await getDb();
  const user = await db.collection<User>("users").findOne({ email: norm(email) });
  if (!user) return { error: "credenciais_invalidas" };
  const ok = await bcrypt.compare(senha, user.passwordHash);
  if (!ok) return { error: "credenciais_invalidas" };
  return { user };
}

export async function findUserById(id?: string | null): Promise<User | null> {
  if (!id) return null;
  const db = await getDb();
  return db.collection<User>("users").findOne({ _id: String(id) });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  return db.collection<User>("users").findOne({ email: norm(email) });
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | null> {
  const db = await getDb();
  await db.collection<User>("users").updateOne({ _id: String(id) }, { $set: patch });
  return findUserById(id);
}

export function publicUser(u: User | null | undefined): PublicUser | null {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return { ...rest, _id: String(u._id) };
}

// ---- Sessoes ----------------------------------------------------------

export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await db.collection<Session>("sessions").insertOne({ _id: token, userId: String(userId), expiresAt });
  return token;
}

export async function findSession(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  const db = await getDb();
  const s = await db.collection<Session>("sessions").findOne({ _id: token });
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) return null;
  return s;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.collection<Session>("sessions").deleteOne({ _id: token });
}

export async function deleteAllSessionsForUser(userId: string): Promise<void> {
  const db = await getDb();
  const col = db.collection<Session>("sessions");
  const rows = await (await col.find({ userId: String(userId) })).toArray();
  await Promise.all(rows.map((s) => col.deleteOne({ _id: s._id })));
}

// ---- Recuperacao de senha ----------------------------------------------

const RESET_MINUTOS = 60;

export async function createPasswordReset(userId: string): Promise<string> {
  const db = await getDb();
  const col = db.collection<PasswordReset>("password_resets");

  // Derruba qualquer token anterior desse usuario antes de criar um novo —
  // evita ter mais de um link "valido" circulando ao mesmo tempo se a
  // pessoa pedir recuperacao mais de uma vez.
  const antigos = await (await col.find({ userId: String(userId) })).toArray();
  await Promise.all(antigos.map((r) => col.deleteOne({ _id: r._id })));

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_MINUTOS * 60 * 1000).toISOString();
  await col.insertOne({ _id: token, userId: String(userId), expiresAt });
  return token;
}

// Uso unico: o token e apagado aqui independente do resultado, entao uma
// segunda tentativa com o mesmo token (valido ou ja expirado) sempre falha.
export async function consumePasswordReset(token: string): Promise<string | null> {
  if (!token) return null;
  const db = await getDb();
  const col = db.collection<PasswordReset>("password_resets");
  const reset = await col.findOne({ _id: token });
  if (!reset) return null;
  await col.deleteOne({ _id: token });
  if (new Date(reset.expiresAt) < new Date()) return null;
  return reset.userId;
}

export async function setUserPassword(userId: string, senha: string): Promise<void> {
  const passwordHash = await bcrypt.hash(senha, 10);
  await updateUser(userId, { passwordHash });
}

// ---- Convites -----------------------------------------------------------

export async function createInvite({ fromUserId, fromNome, toEmail }: { fromUserId: string; fromNome: string; toEmail: string }): Promise<Invite> {
  const db = await getDb();
  const doc: Invite = {
    _id: new ObjectId().toString(),
    fromUserId: String(fromUserId),
    fromNome,
    toEmail: norm(toEmail),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await db.collection<Invite>("invites").insertOne(doc);
  return doc;
}

export async function findInvitesForEmail(email: string): Promise<Invite[]> {
  const db = await getDb();
  const rows = await (await db.collection<Invite>("invites").find({ toEmail: norm(email), status: "pending" })).toArray();
  return rows.map((r) => ({ ...r, _id: String(r._id) }));
}

export async function findInviteById(id: string): Promise<Invite | null> {
  const db = await getDb();
  return db.collection<Invite>("invites").findOne({ _id: String(id) });
}

export async function updateInviteStatus(id: string, status: Invite["status"]): Promise<void> {
  const db = await getDb();
  await db.collection<Invite>("invites").updateOne({ _id: String(id) }, { $set: { status } });
}

// ---- Competicoes --------------------------------------------------------

export async function createCompetition({ memberIds, metaPontos = 150 }: { memberIds: string[]; metaPontos?: number }): Promise<Competition> {
  const db = await getDb();
  const id = new ObjectId().toString();
  const doc: Competition = {
    _id: id,
    memberIds: memberIds.map(String),
    metaPontos,
    roundStart: null,
    historico: [],
    createdAt: new Date().toISOString(),
  };
  await db.collection<Competition>("competitions").insertOne(doc);
  await Promise.all(memberIds.map((uid) => updateUser(uid, { competitionId: id })));
  return doc;
}

export async function findCompetitionById(id?: string | null): Promise<Competition | null> {
  if (!id) return null;
  const db = await getDb();
  return db.collection<Competition>("competitions").findOne({ _id: String(id) });
}

export async function updateCompetition(id: string, patch: Partial<Competition>): Promise<Competition | null> {
  const db = await getDb();
  await db.collection<Competition>("competitions").updateOne({ _id: String(id) }, { $set: patch });
  return findCompetitionById(id);
}

export async function getPartnerId(user: User): Promise<string | null> {
  if (!user.competitionId) return null;
  const comp = await findCompetitionById(user.competitionId);
  if (!comp) return null;
  return comp.memberIds.find((id) => id !== String(user._id)) || null;
}

export async function leaveCompetition(_userId: string, competitionId: string): Promise<void> {
  const comp = await findCompetitionById(competitionId);
  if (!comp) return;
  await Promise.all(comp.memberIds.map((uid) => updateUser(uid, { competitionId: null })));
}
