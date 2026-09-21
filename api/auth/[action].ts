import type { VercelRequest, VercelResponse } from "../_lib/types";
import { createUser, verifyLogin, createSession, publicUser, deleteSession, updateUser } from "../_lib/repo";
import type { User } from "../_lib/repo";
import { setSessionCookie, clearSessionCookie, getSessionUser, SESSION_COOKIE } from "../_lib/authSession";

// Rota dinamica unica pra /api/auth/{signup,login,logout,me} — consolidados
// aqui (eram 4 arquivos) pelo mesmo motivo de api/push/[action].ts: ficar
// dentro do teto de 12 Serverless Functions do plano Hobby da Vercel. URLs
// do lado cliente pros 4 endpoints antigos nao mudam.
//
// Nao ha senha: o e-mail e a credencial. App de uso pessoal de duas pessoas,
// e a recuperacao de senha dependia de um servico de e-mail que nunca foi
// configurado — na pratica, quem esquecia a senha perdia a conta.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDITAVEIS: (keyof User)[] = ["nome", "emoji", "cor", "sexo", "altura", "idade", "kcalMeta", "waterMeta", "proteinaMeta", "minutosAtivosMeta"];

// ---- POST /api/auth/signup ----
async function signup(req: VercelRequest, res: VercelResponse) {
  const { email, nome } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "email_invalido" });
    return;
  }
  const { user, error } = await createUser({ email, nome });
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
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "email_invalido" });
    return;
  }
  const { user, error } = await verifyLogin({ email });
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query.action || "");

  if (action === "signup" && req.method === "POST") return signup(req, res);
  if (action === "login" && req.method === "POST") return login(req, res);
  if (action === "logout" && req.method === "POST") return logout(req, res);
  if (action === "me" && (req.method === "GET" || req.method === "PATCH")) return me(req, res);

  res.status(405).json({ error: "method_not_allowed" });
}
