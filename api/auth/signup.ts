import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createUser, createSession, publicUser } from "../_lib/repo";
import { setSessionCookie } from "../_lib/authSession";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

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
