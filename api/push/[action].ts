import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { getDb, ObjectId } from "../_lib/db";
import { updateUser, publicUser, findCompetitionById, findUserById, getPartnerId } from "../_lib/repo";
import { mergeNotificacoes, type NotificacoesConfig, type TipoNotificacao } from "../_lib/notificacoes";
import { sendToUser } from "../_lib/push";

// Rota dinamica unica pra /api/push/{subscribe,unsubscribe,prefs,notify} —
// consolidados aqui (eram 4 arquivos) pra ficar dentro do teto de 12
// Serverless Functions por deployment do plano Hobby da Vercel. As URLs do
// lado cliente nao mudam nada (mesmo padrao ja usado por api/kv/[key].ts:
// um arquivo dinamico, o "nome da acao" vira parametro de rota). Cada
// handler abaixo e o corpo exato que antes vivia no arquivo proprio, so
// movido pra uma funcao nomeada.

interface PushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

// ---- POST /api/push/subscribe ----
// Corpo e o retorno cru de PushSubscription.toJSON() do browser:
// {endpoint, keys:{p256dh,auth}, expirationTime}. Ignoramos expirationTime
// de proposito (nao guardamos).
async function subscribe(req: VercelRequest, res: VercelResponse, userId: string) {
  const body = req.body || {};
  const endpoint = body.endpoint;
  const keys = body.keys || {};
  const p256dh = keys.p256dh;
  const auth = keys.auth;

  if (typeof endpoint !== "string" || !endpoint || typeof p256dh !== "string" || !p256dh || typeof auth !== "string" || !auth) {
    res.status(400).json({ error: "subscription_invalida" });
    return;
  }

  const db = await getDb();
  const col = db.collection<PushSubscriptionDoc>("push_subscriptions");

  // Dedupe SO por endpoint (nao {userId, endpoint}) — endpoint ja e unico
  // por subscription fisica do browser. Isso faz uma troca de conta no
  // mesmo aparelho REASSIGNAR a subscription pro novo dono, em vez de
  // arriscar duas linhas endereçando o mesmo endpoint pra pessoas
  // diferentes.
  const existing = await col.findOne({ endpoint });
  if (existing) {
    await col.updateOne({ endpoint }, { $set: { userId, keys: { p256dh, auth } } });
  } else {
    await col.insertOne({ _id: new ObjectId().toString(), userId, endpoint, keys: { p256dh, auth }, createdAt: new Date().toISOString() });
  }

  res.status(200).json({ ok: true });
}

// ---- POST /api/push/unsubscribe ----
// Idempotente de proposito — sempre {ok:true}, mesmo se nao havia nada pra
// apagar (chamado tanto no fluxo normal de "desativar notificacoes" quanto
// no ensurePushIsolation de troca de usuario no mesmo aparelho).
async function unsubscribe(req: VercelRequest, res: VercelResponse, userId: string) {
  const endpoint = (req.body || {}).endpoint;
  if (typeof endpoint === "string" && endpoint) {
    const db = await getDb();
    const col = db.collection<PushSubscriptionDoc>("push_subscriptions");
    const existing = await col.findOne({ endpoint });
    // So apaga se o dono bater com a sessao que esta chamando — nunca deixa
    // um client apagar um endpoint que ele nao possui so por adivinhar/
    // reenviar o valor.
    if (existing && String(existing.userId) === userId) {
      await col.deleteOne({ endpoint });
    }
  }
  res.status(200).json({ ok: true });
}

// ---- PATCH /api/push/prefs ----
// Validado campo a campo — deliberadamente NAO entra na whitelist solta de
// EDITAVEIS que api/auth/me.ts usa pra User (aquele padrao aceita qualquer
// shape sem checar nada; um objeto aninhado como NotificacoesConfig merece
// validacao de verdade). Um campo malformado e so ignorado (mantem o valor
// anterior), nunca derruba a requisicao inteira por causa de um campo so.
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const isBool = (v: any): v is boolean => typeof v === "boolean";
const isHora = (v: any): v is string => typeof v === "string" && HORA_RE.test(v);
const isHorarios = (v: any): v is string[] => Array.isArray(v) && v.length <= 10 && v.every((h) => isHora(h));
const TIPOS_SIMPLES = ["fimDeRodada", "refeicao", "pesagem", "parceiroPR", "parceiroRanking", "badge"] as const;

async function prefs(req: VercelRequest, res: VercelResponse, userId: string, notificacoesAtuais: NotificacoesConfig | undefined) {
  const body = req.body || {};
  const base = mergeNotificacoes(notificacoesAtuais);
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

  const updated = await updateUser(userId, { notificacoes: next });
  res.status(200).json({ user: publicUser(updated) });
}

// ---- POST /api/push/notify ----
const TIPOS_VALIDOS: TipoNotificacao[] = ["fimDeRodada", "parceiroPR", "parceiroRanking", "badge"];
// Copy dos 3 tipos de evento entre parceiros que ainda nao tem ponto de
// disparo no cliente nesta fase (opt-in, desligados por padrao — corte de
// escopo explicito). A rota ja aceita e roteia corretamente pro parceiro,
// pra uma fase futura so precisar chamar isto, sem mexer aqui.
const COPY_PARCEIRO: Record<string, { title: string; body: string }> = {
  parceiroPR: { title: "Recorde pessoal do parceiro! 💪", body: " bateu um novo recorde pessoal." },
  parceiroRanking: { title: "Você foi ultrapassado no ranking! 📈", body: " passou você no placar da rodada atual." },
  badge: { title: "Novo título desbloqueado! 🏅", body: " desbloqueou um novo título em \"O Sistema\"." },
};

async function notify(req: VercelRequest, res: VercelResponse, userId: string, userNome: string) {
  const { tipo, winnerUserId } = req.body || {};
  if (!TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ error: "tipo_invalido" });
    return;
  }

  if (tipo === "fimDeRodada") {
    const userAtual = await findUserById(userId);
    if (!userAtual?.competitionId) {
      res.status(200).json({ ok: true, results: [] });
      return;
    }
    const comp = await findCompetitionById(userAtual.competitionId);
    if (!comp) {
      res.status(200).json({ ok: true, results: [] });
      return;
    }
    // winnerUserId e so texto de copy (quem "ganhou" pro corpo da mensagem),
    // nao uma decisao de autorizacao — nivel de confianca aceitavel aqui.
    // Cai pro proprio chamador se vier ausente/invalido.
    const vencedorId = comp.memberIds.includes(String(winnerUserId)) ? String(winnerUserId) : userId;
    const vencedor = await findUserById(vencedorId);
    const nomeVencedor = vencedor?.nome || "Alguém";

    // Fim de rodada e compartilhado, nao pessoal — notifica os DOIS membros.
    const results = await Promise.all(
      comp.memberIds.map((uid) =>
        sendToUser(uid, {
          tipo: "fimDeRodada",
          title: "Rodada encerrada! 🏆",
          body: `${nomeVencedor} bateu a meta e venceu a rodada. Toque pra ver o placar e começar a próxima.`,
          url: "/",
        })
      )
    );
    res.status(200).json({ ok: true, results });
    return;
  }

  // parceiroPR / parceiroRanking / badge — infra generica: notifica o
  // parceiro de competicao ativo. Sem ponto de disparo no cliente ainda.
  const userAtual = await findUserById(userId);
  const partnerId = userAtual ? await getPartnerId(userAtual) : null;
  if (!partnerId) {
    res.status(200).json({ ok: true, results: [] });
    return;
  }
  const copy = COPY_PARCEIRO[tipo];
  const result = await sendToUser(partnerId, { tipo, title: copy.title, body: `${userNome}${copy.body}`, url: "/" });
  res.status(200).json({ ok: true, results: [result] });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const action = String(req.query.action || "");
  const userId = String(user._id);

  if (action === "subscribe" && req.method === "POST") return subscribe(req, res, userId);
  if (action === "unsubscribe" && req.method === "POST") return unsubscribe(req, res, userId);
  if (action === "prefs" && req.method === "PATCH") return prefs(req, res, userId, user.notificacoes);
  if (action === "notify" && req.method === "POST") return notify(req, res, userId, user.nome);

  res.status(405).json({ error: "method_not_allowed" });
}
