import type { VercelRequest, VercelResponse } from "./_lib/types";
import { getSessionUser } from "./_lib/authSession";
import { findCompetitionById, updateCompetition, findUserById, publicUser, leaveCompetition } from "./_lib/repo";
import type { Competition } from "./_lib/repo";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    if (!user.competitionId) {
      res.status(200).json({ competition: null, partner: null });
      return;
    }
    const competition = await findCompetitionById(user.competitionId);
    if (!competition) {
      res.status(200).json({ competition: null, partner: null });
      return;
    }
    const partnerId = competition.memberIds.find((id) => id !== String(user._id));
    const partner = await findUserById(partnerId);
    res.status(200).json({ competition, partner: publicUser(partner) });
    return;
  }

  if (req.method === "PATCH") {
    if (!user.competitionId) {
      res.status(400).json({ error: "sem_competicao" });
      return;
    }
    const body = req.body || {};
    const patch: Partial<Competition> = {};
    if ("roundStart" in body) patch.roundStart = body.roundStart;
    if ("historico" in body) patch.historico = body.historico;
    if ("metaPontos" in body) patch.metaPontos = body.metaPontos;

    const competition = await updateCompetition(user.competitionId, patch);
    res.status(200).json({ competition });
    return;
  }

  if (req.method === "DELETE") {
    if (user.competitionId) await leaveCompetition(user._id, user.competitionId);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
