import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { updateUser, publicUser } from "../_lib/repo";
import { mergeNotificacoes, type NotificacoesConfig } from "../_lib/notificacoes";

// PATCH validado campo a campo — deliberadamente NAO entra na whitelist
// solta de EDITAVEIS que api/auth/me.ts usa pra User (aquele padrao aceita
// qualquer shape sem checar nada; um objeto aninhado como NotificacoesConfig
// merece validacao de verdade). Um campo malformado e so ignorado (mantem o
// valor anterior), nunca derruba a requisicao inteira por causa de um campo
// so.

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const isBool = (v: any): v is boolean => typeof v === "boolean";
const isHora = (v: any): v is string => typeof v === "string" && HORA_RE.test(v);
const isHorarios = (v: any): v is string[] => Array.isArray(v) && v.length <= 10 && v.every((h) => isHora(h));

const TIPOS_SIMPLES = ["fimDeRodada", "refeicao", "pesagem", "parceiroPR", "parceiroRanking", "badge"] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = req.body || {};
  const base = mergeNotificacoes(user.notificacoes);
  const next: NotificacoesConfig = {
    agua: { ...base.agua },
    treino: { ...base.treino },
    fimDeRodada: { ...base.fimDeRodada },
    refeicao: { ...base.refeicao },
    pesagem: { ...base.pesagem },
    parceiroPR: { ...base.parceiroPR },
    parceiroRanking: { ...base.parceiroRanking },
    badge: { ...base.badge },
    quietHours: { ...base.quietHours },
  };

  for (const k of TIPOS_SIMPLES) {
    const v = body[k];
    if (v && typeof v === "object" && isBool(v.on)) next[k] = { on: v.on };
  }

  if (body.agua && typeof body.agua === "object") {
    if (isBool(body.agua.on)) next.agua.on = body.agua.on;
    if (isHorarios(body.agua.horarios)) next.agua.horarios = body.agua.horarios;
  }

  if (body.treino && typeof body.treino === "object") {
    if (isBool(body.treino.on)) next.treino.on = body.treino.on;
    if (isHora(body.treino.horario)) next.treino.horario = body.treino.horario;
  }

  if (body.quietHours && typeof body.quietHours === "object") {
    if (isHora(body.quietHours.inicio)) next.quietHours.inicio = body.quietHours.inicio;
    if (isHora(body.quietHours.fim)) next.quietHours.fim = body.quietHours.fim;
  }

  const updated = await updateUser(user._id, { notificacoes: next });
  res.status(200).json({ user: publicUser(updated) });
}
