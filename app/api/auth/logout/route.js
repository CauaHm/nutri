import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/repo";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/authSession";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
