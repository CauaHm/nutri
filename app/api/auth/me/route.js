import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/authSession";
import { updateUser, publicUser } from "@/lib/repo";

const EDITAVEIS = ["nome", "emoji", "cor", "sexo", "altura", "idade", "kcalMeta", "waterMeta", "proteinaMeta"];

export async function GET() {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}

export async function PATCH(req) {
  const user = await getSessionUser(await cookies());
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const patch = {};
  for (const k of EDITAVEIS) if (k in body) patch[k] = body[k];
  const updated = await updateUser(user._id, patch);
  return NextResponse.json({ user: publicUser(updated) });
}
