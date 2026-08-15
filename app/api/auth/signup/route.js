import { NextResponse } from "next/server";
import { createUser, createSession, publicUser } from "@/lib/repo";
import { setSessionCookie } from "@/lib/authSession";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  const { email, senha, nome } = await req.json();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "email_invalido" }, { status: 400 });
  }
  if (!senha || senha.length < 6) {
    return NextResponse.json({ error: "senha_curta" }, { status: 400 });
  }
  const { user, error } = await createUser({ email, senha, nome });
  if (error) return NextResponse.json({ error }, { status: 409 });

  const token = await createSession(user._id);
  const res = NextResponse.json({ user: publicUser(user) });
  setSessionCookie(res, token);
  return res;
}
