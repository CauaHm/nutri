import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser } from "../../_lib/authSession";
import { findInviteById, updateInviteStatus, createCompetition } from "../../_lib/repo";

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
  const id = String(req.query.id);
  const { action } = req.body || {};

  const invite = await findInviteById(id);
  if (!invite || invite.toEmail !== user.email || invite.status !== "pending") {
    res.status(404).json({ error: "convite_invalido" });
    return;
  }

  if (action === "decline") {
    await updateInviteStatus(id, "declined");
    res.status(200).json({ ok: true });
    return;
  }

  if (action === "accept") {
    if (user.competitionId) {
      res.status(409).json({ error: "ja_em_competicao" });
      return;
    }
    await updateInviteStatus(id, "accepted");
    const competition = await createCompetition({ memberIds: [invite.fromUserId, user._id] });
    res.status(200).json({ competition });
    return;
  }

  res.status(400).json({ error: "acao_invalida" });
}
