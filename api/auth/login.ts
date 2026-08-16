import type { VercelRequest, VercelResponse } from "../_lib/types";
import { verifyLogin, createSession, publicUser } from "../_lib/repo";
import { setSessionCookie } from "../_lib/authSession";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

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
