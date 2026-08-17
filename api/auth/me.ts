import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { updateUser, publicUser } from "../_lib/repo";
import type { User } from "../_lib/repo";

const EDITAVEIS: (keyof User)[] = ["nome", "emoji", "cor", "sexo", "altura", "idade", "kcalMeta", "waterMeta", "proteinaMeta", "minutosAtivosMeta"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
