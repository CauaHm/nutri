import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGetMany } from "@/lib/store";
import { getSessionUser, canReadKey } from "@/lib/authSession";
import { getPartnerId } from "@/lib/repo";

const KEY_RE = /^[a-zA-Z0-9_:.-]{1,200}$/;

export async function POST(req) {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { keys } = await req.json();
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > 60) {
    return NextResponse.json({ error: "invalid keys" }, { status: 400 });
  }
  const partnerId = await getPartnerId(user);
  if (!keys.every((k) => KEY_RE.test(k) && canReadKey(user, k, partnerId))) {
    return NextResponse.json({ error: "invalid keys" }, { status: 400 });
  }
  const values = await kvGetMany(keys);
  return NextResponse.json({ values });
}
