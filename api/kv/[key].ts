import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kvGet, kvSet } from "../_lib/store";
import { getSessionUser, canReadKey, canWriteKey } from "../_lib/authSession";
import { getPartnerId } from "../_lib/repo";

// Chaves sao restritas a um padrao simples (letras, numeros, _ e :) pra
// evitar qualquer chance de path/key injection vinda da URL.
const KEY_RE = /^[a-zA-Z0-9_:.-]{1,200}$/;

function unauthorized(res: VercelResponse) {
  res.status(401).json({ error: "unauthorized" });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    unauthorized(res);
    return;
  }
  const key = String(req.query.key);

  if (req.method === "GET") {
    if (!KEY_RE.test(key)) {
      unauthorized(res);
      return;
    }
    const partnerId = await getPartnerId(user);
    if (!canReadKey(user, key, partnerId)) {
      unauthorized(res);
      return;
    }
    const value = await kvGet(key);
    res.status(200).json({ value });
    return;
  }

  if (req.method === "PUT") {
    if (!KEY_RE.test(key) || !canWriteKey(user, key)) {
      unauthorized(res);
      return;
    }
    const body = req.body || {};
    await kvSet(key, body.value);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
