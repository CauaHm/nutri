import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/authSession";
import { createInvite, findInvitesForEmail } from "@/lib/repo";

// Sem servico de email configurado: o convite so aparece quando a pessoa
// convidada faz login (ou cadastro) com esse mesmo email. Nao envia nada
// por fora — e um convite "caixa de entrada dentro do app", nao email real.

export async function GET() {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const recebidos = await findInvitesForEmail(user.email);
  return NextResponse.json({ recebidos });
}

export async function POST(req) {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.competitionId) {
    return NextResponse.json({ error: "ja_em_competicao" }, { status: 409 });
  }
  const { toEmail } = await req.json();
  const alvo = String(toEmail || "").trim().toLowerCase();
  if (!alvo || alvo === user.email) {
    return NextResponse.json({ error: "email_invalido" }, { status: 400 });
  }
  const invite = await createInvite({ fromUserId: user._id, fromNome: user.nome, toEmail: alvo });
  return NextResponse.json({ invite });
}
