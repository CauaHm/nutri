import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/authSession";
import { findCompetitionById, updateCompetition, findUserById, publicUser, leaveCompetition } from "@/lib/repo";

export async function GET() {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.competitionId) return NextResponse.json({ competition: null, partner: null });

  const competition = await findCompetitionById(user.competitionId);
  if (!competition) return NextResponse.json({ competition: null, partner: null });

  const partnerId = competition.memberIds.find((id) => id !== String(user._id));
  const partner = await findUserById(partnerId);
  return NextResponse.json({ competition, partner: publicUser(partner) });
}

export async function PATCH(req) {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.competitionId) return NextResponse.json({ error: "sem_competicao" }, { status: 400 });

  const body = await req.json();
  const patch = {};
  if ("roundStart" in body) patch.roundStart = body.roundStart;
  if ("historico" in body) patch.historico = body.historico;
  if ("metaPontos" in body) patch.metaPontos = body.metaPontos;

  const competition = await updateCompetition(user.competitionId, patch);
  return NextResponse.json({ competition });
}

export async function DELETE() {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.competitionId) await leaveCompetition(user._id, user.competitionId);
  return NextResponse.json({ ok: true });
}
