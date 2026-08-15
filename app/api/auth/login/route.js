import { NextResponse } from "next/server";
import { verifyLogin, createSession, publicUser } from "@/lib/repo";
import { setSessionCookie } from "@/lib/authSession";

export async function POST(req) {
  const { email, senha } = await req.json();
  if (!email || !senha) {
    return NextResponse.json({ error: "campos_faltando" }, { status: 400 });
  }
  const { user, error } = await verifyLogin({ email, senha });
  if (error) return NextResponse.json({ error }, { status: 401 });

  const token = await createSession(user._id);
  const res = NextResponse.json({ user: publicUser(user) });
  setSessionCookie(res, token);
  return res;
}
