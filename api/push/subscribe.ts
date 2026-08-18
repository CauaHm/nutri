import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { getDb, ObjectId } from "../_lib/db";

interface PushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

// Corpo e o retorno cru de PushSubscription.toJSON() do browser:
// {endpoint, keys:{p256dh,auth}, expirationTime}. Ignoramos expirationTime
// de proposito (nao guardamos).
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

  const body = req.body || {};
  const endpoint = body.endpoint;
  const keys = body.keys || {};
  const p256dh = keys.p256dh;
  const auth = keys.auth;

  if (typeof endpoint !== "string" || !endpoint || typeof p256dh !== "string" || !p256dh || typeof auth !== "string" || !auth) {
    res.status(400).json({ error: "subscription_invalida" });
    return;
  }

  const db = await getDb();
  const col = db.collection<PushSubscriptionDoc>("push_subscriptions");

  // Dedupe SO por endpoint (nao {userId, endpoint}) — endpoint ja e unico
  // por subscription fisica do browser. Isso faz uma troca de conta no
  // mesmo aparelho REASSIGNAR a subscription pro novo dono, em vez de
  // arriscar duas linhas endereçando o mesmo endpoint pra pessoas
  // diferentes.
  const existing = await col.findOne({ endpoint });
  if (existing) {
    await col.updateOne({ endpoint }, { $set: { userId: String(user._id), keys: { p256dh, auth } } });
  } else {
    await col.insertOne({
      _id: new ObjectId().toString(),
      userId: String(user._id),
      endpoint,
      keys: { p256dh, auth },
      createdAt: new Date().toISOString(),
    });
  }

  res.status(200).json({ ok: true });
}
