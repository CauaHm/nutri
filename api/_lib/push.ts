import webpush from "web-push";
import { getDb, ObjectId } from "./db";
import { findUserById } from "./repo";
import { mergeNotificacoes, TIPOS_DEBOUNCE_12H, type TipoNotificacao } from "./notificacoes";
import { diaLocalSP_ISO, dentroDoQuietHours } from "./tempoLocal";

// Ponto UNICO de aplicacao das 4 regras de anti-spam. Todo disparo de push
// (cron de lembretes, evento de parceiro) passa por aqui — ninguem
// reimplementa quiet-hours/teto diario/debounce por conta propria.
//
// Ordem dos checks: do mais barato/decisivo pro mais caro (I/O), pra sair
// cedo sem gastar leitura de banco a toa.
//
//   1. tipo desligado nas preferencias -> nao envia
//   2. dentro do horario silencioso (22h-7h SP) -> nao envia, e nao "repoe"
//      depois — quem chama isto so pergunta "deveria disparar AGORA", nunca
//      reprocessa uma janela perdida
//   3. teto de 4/dia/usuario, contado a partir de push_log (nunca memoria —
//      resetaria a cada cold start serverless)
//   4. debounce de 12h, mas SO pros 4 tipos de evento entre parceiros
//      (fimDeRodada/parceiroPR/parceiroRanking/badge) — nunca nos 4 tipos
//      agendados (agua dispara ate 3x/dia, <12h entre si, e isso e valido)

const DIAS_RETENCAO_LOG = 3;
const HORAS_DEBOUNCE = 12;
const TETO_DIARIO = 4;

export interface PushNotificationInput {
  tipo: TipoNotificacao;
  title: string;
  body: string;
  url?: string;
}

export interface SendResult {
  sent: number;
  skipped: string | null;
}

interface PushSubscriptionDoc {
  _id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

interface PushLogDoc {
  _id: string;
  userId: string;
  tipo: TipoNotificacao;
  enviadoEm: string;
}

let avisouVapidAusente = false;

function vapidConfigurado(): boolean {
  const ok = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
  if (!ok && !avisouVapidAusente) {
    avisouVapidAusente = true;
    console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT nao configuradas — push desativado.");
  }
  return ok;
}

export async function sendToUser(userId: string, notif: PushNotificationInput): Promise<SendResult> {
  if (!vapidConfigurado()) return { sent: 0, skipped: "vapid_not_configured" };

  const user = await findUserById(userId);
  if (!user) return { sent: 0, skipped: "user_not_found" };

  const prefs = mergeNotificacoes(user.notificacoes);
  if (!prefs[notif.tipo].on) return { sent: 0, skipped: "tipo_desligado" };

  if (dentroDoQuietHours(prefs.quietHours)) return { sent: 0, skipped: "quiet_hours" };

  const db = await getDb();
  const logCol = db.collection<PushLogDoc>("push_log");
  const meusLogs = await (await logCol.find({ userId: String(userId) })).toArray();

  const hojeISO = diaLocalSP_ISO();
  const enviadosHoje = meusLogs.filter((l) => diaLocalSP_ISO(new Date(l.enviadoEm)) === hojeISO).length;
  if (enviadosHoje >= TETO_DIARIO) return { sent: 0, skipped: "teto_diario" };

  if (TIPOS_DEBOUNCE_12H.includes(notif.tipo)) {
    const mesmoTipo = meusLogs.filter((l) => l.tipo === notif.tipo).sort((a, b) => new Date(b.enviadoEm).getTime() - new Date(a.enviadoEm).getTime());
    const ultimo = mesmoTipo[0];
    if (ultimo) {
      const horasDesde = (Date.now() - new Date(ultimo.enviadoEm).getTime()) / 3600000;
      if (horasDesde < HORAS_DEBOUNCE) return { sent: 0, skipped: "debounce_12h" };
    }
  }

  const subsCol = db.collection<PushSubscriptionDoc>("push_subscriptions");
  const subs = await (await subsCol.find({ userId: String(userId) })).toArray();
  if (!subs.length) return { sent: 0, skipped: "no_subscriptions" };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT as string, process.env.VAPID_PUBLIC_KEY as string, process.env.VAPID_PRIVATE_KEY as string);

  const payload = JSON.stringify({ title: notif.title, body: notif.body, tipo: notif.tipo, url: notif.url || "/" });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sent++;
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // subscription morta (usuario desinstalou/revogou permissao) —
          // limpa imediatamente, senao acumula lixo e continua tentando pra
          // sempre.
          await subsCol.deleteOne({ _id: sub._id });
        } else {
          console.error(`[push] falha ao enviar pra ${sub.endpoint}:`, err?.message || err);
        }
      }
    })
  );

  if (sent > 0) {
    await logCol.insertOne({ _id: new ObjectId().toString(), userId: String(userId), tipo: notif.tipo, enviadoEm: new Date().toISOString() });
    // Poda best-effort — mantem push_log pequeno sem depender de indice TTL
    // (MinimalCollection/fallback local nao expoe isso). Nunca deixa uma
    // falha aqui derrubar o envio que ja aconteceu.
    try {
      const limite = Date.now() - DIAS_RETENCAO_LOG * 86400000;
      const antigos = meusLogs.filter((l) => new Date(l.enviadoEm).getTime() < limite);
      await Promise.all(antigos.map((l) => logCol.deleteOne({ _id: l._id })));
    } catch (err) {
      console.error("[push] falha ao podar push_log:", err);
    }
  }

  return { sent, skipped: sent > 0 ? null : "send_failed" };
}
