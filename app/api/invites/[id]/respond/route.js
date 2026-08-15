import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/authSession";
import { findInviteById, updateInviteStatus, createCompetition } from "@/lib/repo";

export async function POST(req, { params }) {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = await req.json();

  const invite = await findInviteById(id);
  if (!invite || invite.toEmail !== user.email || invite.status !== "pending") {
    return NextResponse.json({ error: "convite_invalido" }, { status: 404 });
  }

  if (action === "decline") {
    await updateInviteStatus(id, "declined");
    return NextResponse.json({ ok: true });
  }

  if (action === "accept") {
    if (user.competitionId) {
      return NextResponse.json({ error: "ja_em_competicao" }, { status: 409 });
    }
    await updateInviteStatus(id, "accepted");
    const competition = await createCompetition({ memberIds: [invite.fromUserId, user._id] });
    return NextResponse.json({ competition });
  }

  return NextResponse.json({ error: "acao_invalida" }, { status: 400 });
}
