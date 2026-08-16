import type { VercelRequest, VercelResponse } from "../_lib/types";
import { kvGetMany } from "../_lib/store";
import { getSessionUser, canReadKey } from "../_lib/authSession";
import { getPartnerId } from "../_lib/repo";

const KEY_RE = /^[a-zA-Z0-9_:.-]{1,200}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const { keys } = req.body || {};
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > 60) {
    res.status(400).json({ error: "invalid keys" });
    return;
  }
  const partnerId = await getPartnerId(user);
  if (!keys.every((k: string) => KEY_RE.test(k) && canReadKey(user, k, partnerId))) {
    res.status(400).json({ error: "invalid keys" });
    return;
  }
  const values = await kvGetMany(keys);
  res.status(200).json({ values });
}
