import type { VercelRequest, VercelResponse } from "../_lib/types";
import {
  createUser,
  verifyLogin,
  createSession,
  publicUser,
  deleteSession,
  updateUser,
  findUserById,
  findUserByEmail,
  createPasswordReset,
  consumePasswordReset,
  setUserPassword,
  deleteAllSessionsForUser,
} from "../_lib/repo";
import type { User } from "../_lib/repo";
import { setSessionCookie, clearSessionCookie, getSessionUser, SESSION_COOKIE } from "../_lib/authSession";
import { sendPasswordResetEmail } from "../_lib/email";

// Rota dinamica unica pra /api/auth/{signup,login,logout,me,forgot-password,
// reset-password} — consolidados aqui (eram 4 arquivos: login/logout/me/
// signup) pelo mesmo motivo de api/push/[action].ts: ficar dentro do teto
// de 12 Serverless Functions do plano Hobby da Vercel. Reduzir 4 arquivos a
// 1 abre espaco pras duas rotas novas de recuperacao de senha sem estourar
// o teto de novo. URLs do lado cliente pros 4 endpoints antigos nao mudam.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDITAVEIS: (keyof User)[] = ["nome", "emoji", "cor", "sexo", "altura", "idade", "kcalMeta", "waterMeta", "proteinaMeta", "minutosAtivosMeta"];

// ---- POST /api/auth/signup ----
async function signup(req: VercelRequest, res: VercelResponse) {
  const { email, senha, nome } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "email_invalido" });
    return;
  }
  if (!senha || senha.length < 6) {
    res.status(400).json({ error: "senha_curta" });
    return;
  }
  const { user, error } = await createUser({ email, senha, nome });
  if (error || !user) {
    res.status(409).json({ error });
    return;
  }
  const token = await createSession(user._id);
  setSessionCookie(res, token);
  res.status(200).json({ user: publicUser(user) });
}

// ---- POST /api/auth/login ----
async function login(req: VercelRequest, res: VercelResponse) {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    res.status(400).json({ error: "campos_faltando" });
    return;
  }
  const { user, error } = await verifyLogin({ email, senha });
  if (error || !user) {
    res.status(401).json({ error });
    return;
  }
  const token = await createSession(user._id);
  setSessionCookie(res, token);
  res.status(200).json({ user: publicUser(user) });
}

// ---- POST /api/auth/logout ----
async function logout(req: VercelRequest, res: VercelResponse) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}

// ---- GET/PATCH /api/auth/me ----
async function me(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ user: null });
      return;
    }
    res.status(200).json({ user: publicUser(user) });
    return;
  }

  if (req.method === "PATCH") {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const body = req.body || {};
    const patch: Partial<User> = {};
    for (const k of EDITAVEIS) if (k in body) (patch as Record<string, any>)[k] = body[k];
    const updated = await updateUser(user._id, patch);
    res.status(200).json({ user: publicUser(updated) });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}

// ---- POST /api/auth/forgot-password ----
// Sempre responde {ok:true}, o email existindo ou nao — nunca da pra quem
// chama um jeito de descobrir, por essa rota, se um endereco tem conta
// cadastrada. O email de recuperacao so sai de fato quando o endereco bate
// com uma conta existente.
function baseUrlFromReq(req: VercelRequest): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const host = (req.headers.host as string) || "localhost:5173";
  const proto = (req.headers["x-forwarded-proto"] as string) || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function forgotPassword(req: VercelRequest, res: VercelResponse) {
  const { email } = req.body || {};
  if (typeof email === "string" && EMAIL_RE.test(email)) {
    const user = await findUserByEmail(email);
    if (user) {
      const token = await createPasswordReset(user._id);
      const resetUrl = `${baseUrlFromReq(req)}/?reset=${token}`;
      await sendPasswordResetEmail({ to: user.email, nome: user.nome, resetUrl });
    }
  }
  res.status(200).json({ ok: true });
}

// ---- POST /api/auth/reset-password ----
async function resetPassword(req: VercelRequest, res: VercelResponse) {
  const { token, senha } = req.body || {};
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "token_invalido" });
    return;
  }
  if (!senha || senha.length < 6) {
    res.status(400).json({ error: "senha_curta" });
    return;
  }

  const userId = await consumePasswordReset(token);
  if (!userId) {
    res.status(400).json({ error: "token_invalido" });
    return;
  }

  await setUserPassword(userId, senha);
  // Troca de senha por recuperacao e um sinal de que a conta pode ter sido
  // comprometida — derruba qualquer sessao antiga (inclusive de quem tiver
  // tomado a conta) em vez de deixar alguem logado por baixo disso.
  await deleteAllSessionsForUser(userId);

  const user = await findUserById(userId);
  const newToken = await createSession(userId);
  setSessionCookie(res, newToken);
  res.status(200).json({ user: publicUser(user) });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || "");

  if (action === "signup" && req.method === "POST") return signup(req, res);
  if (action === "login" && req.method === "POST") return login(req, res);
  if (action === "logout" && req.method === "POST") return logout(req, res);
  if (action === "me" && (req.method === "GET" || req.method === "PATCH")) return me(req, res);
  if (action === "forgot-password" && req.method === "POST") return forgotPassword(req, res);
  if (action === "reset-password" && req.method === "POST") return resetPassword(req, res);

  res.status(405).json({ error: "method_not_allowed" });
}
