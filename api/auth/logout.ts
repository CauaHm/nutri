import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteSession } from "../_lib/repo";
import { SESSION_COOKIE, clearSessionCookie } from "../_lib/authSession";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await deleteSession(token);
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
