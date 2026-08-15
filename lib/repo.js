import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getDb, ObjectId } from "@/lib/db";

const SESSION_DAYS = 30;
const norm = (email) => String(email || "").trim().toLowerCase();

// ---- Usuarios -------------------------------------------------------

export async function createUser({ email, senha, nome }) {
  const db = await getDb();
  const users = db.collection("users");
  const existing = await users.findOne({ email: norm(email) });
  if (existing) return { error: "email_em_uso" };

  const passwordHash = await bcrypt.hash(senha, 10);
  const _id = new ObjectId().toString();
  const doc = {
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
    competitionId: null,
    createdAt: new Date().toISOString(),
  };
  await users.insertOne(doc);
  return { user: doc };
}

export async function verifyLogin({ email, senha }) {
  const db = await getDb();
  const user = await db.collection("users").findOne({ email: norm(email) });
  if (!user) return { error: "credenciais_invalidas" };
  const ok = await bcrypt.compare(senha, user.passwordHash);
  if (!ok) return { error: "credenciais_invalidas" };
  return { user };
}

export async function findUserById(id) {
  if (!id) return null;
  const db = await getDb();
  return db.collection("users").findOne({ _id: String(id) });
}

export async function findUserByEmail(email) {
  const db = await getDb();
  return db.collection("users").findOne({ email: norm(email) });
}

export async function updateUser(id, patch) {
  const db = await getDb();
  await db.collection("users").updateOne({ _id: String(id) }, { $set: patch });
  return findUserById(id);
}

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return { ...rest, _id: String(u._id) };
}

// ---- Sessoes ----------------------------------------------------------

export async function createSession(userId) {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
  await db.collection("sessions").insertOne({ _id: token, userId: String(userId), expiresAt });
  return token;
}

export async function findSession(token) {
  if (!token) return null;
  const db = await getDb();
  const s = await db.collection("sessions").findOne({ _id: token });
  if (!s) return null;
  if (new Date(s.expiresAt) < new Date()) return null;
  return s;
}

export async function deleteSession(token) {
  const db = await getDb();
  await db.collection("sessions").deleteOne({ _id: token });
}

// ---- Convites -----------------------------------------------------------

export async function createInvite({ fromUserId, fromNome, toEmail }) {
  const db = await getDb();
  const doc = {
    _id: new ObjectId().toString(),
    fromUserId: String(fromUserId),
    fromNome,
    toEmail: norm(toEmail),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await db.collection("invites").insertOne(doc);
  return doc;
}

export async function findInvitesForEmail(email) {
  const db = await getDb();
  const rows = await (await db.collection("invites").find({ toEmail: norm(email), status: "pending" })).toArray();
  return rows.map((r) => ({ ...r, _id: String(r._id) }));
}

export async function findInviteById(id) {
  const db = await getDb();
  return db.collection("invites").findOne({ _id: String(id) });
}

export async function updateInviteStatus(id, status) {
  const db = await getDb();
  await db.collection("invites").updateOne({ _id: String(id) }, { $set: { status } });
}

// ---- Competicoes --------------------------------------------------------

export async function createCompetition({ memberIds, metaPontos = 150 }) {
  const db = await getDb();
  const id = new ObjectId().toString();
  const doc = {
    _id: id,
    memberIds: memberIds.map(String),
    metaPontos,
    roundStart: null,
    historico: [],
    createdAt: new Date().toISOString(),
  };
  await db.collection("competitions").insertOne(doc);
  await Promise.all(memberIds.map((uid) => updateUser(uid, { competitionId: id })));
  return doc;
}

export async function findCompetitionById(id) {
  if (!id) return null;
  const db = await getDb();
  return db.collection("competitions").findOne({ _id: String(id) });
}

export async function updateCompetition(id, patch) {
  const db = await getDb();
  await db.collection("competitions").updateOne({ _id: String(id) }, { $set: patch });
  return findCompetitionById(id);
}

export async function getPartnerId(user) {
  if (!user.competitionId) return null;
  const comp = await findCompetitionById(user.competitionId);
  if (!comp) return null;
  return comp.memberIds.find((id) => id !== String(user._id)) || null;
}

export async function leaveCompetition(userId, competitionId) {
  const comp = await findCompetitionById(competitionId);
  if (!comp) return;
  await Promise.all(comp.memberIds.map((uid) => updateUser(uid, { competitionId: null })));
}
