import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { getDb } from "../_lib/db";

interface PushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

// Idempotente de proposito — sempre {ok:true}, mesmo se nao havia nada pra
// apagar (chamado tanto no fluxo normal de "desativar notificacoes" quanto
// no ensurePushIsolation de troca de usuario no mesmo aparelho).
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

  const endpoint = (req.body || {}).endpoint;
  if (typeof endpoint === "string" && endpoint) {
    const db = await getDb();
    const col = db.collection<PushSubscriptionDoc>("push_subscriptions");
    const existing = await col.findOne({ endpoint });
    // So apaga se o dono bater com a sessao que esta chamando — nunca deixa
    // um client apagar um endpoint que ele nao possui so por adivinhar/
    // reenviar o valor.
    if (existing && String(existing.userId) === String(user._id)) {
      await col.deleteOne({ endpoint });
    }
  }

  res.status(200).json({ ok: true });
}
