import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { kvGet, kvSet } from "@/lib/store";
import { getSessionUser, canReadKey, canWriteKey } from "@/lib/authSession";
import { getPartnerId } from "@/lib/repo";

// Chaves sao restritas a um padrao simples (letras, numeros, _ e :) pra
// evitar qualquer chance de path/key injection vinda da URL.
const KEY_RE = /^[a-zA-Z0-9_:.-]{1,200}$/;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(_req, { params }) {
  const user = await getSessionUser(await cookies());
  if (!user) return unauthorized();
  const { key } = await params;
  if (!KEY_RE.test(key)) return unauthorized();
  const partnerId = await getPartnerId(user);
  if (!canReadKey(user, key, partnerId)) return unauthorized();
  const value = await kvGet(key);
  return NextResponse.json({ value });
}

export async function PUT(req, { params }) {
  const user = await getSessionUser(await cookies());
  if (!user) return unauthorized();
  const { key } = await params;
  if (!KEY_RE.test(key) || !canWriteKey(user, key)) return unauthorized();
  const body = await req.json();
  await kvSet(key, body.value);
  return NextResponse.json({ ok: true });
}
