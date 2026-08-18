import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getDb } from "../_lib/db";
import type { User } from "../_lib/repo";
import { kvGet } from "../_lib/store";
import { mergeNotificacoes } from "../_lib/notificacoes";
import { sendToUser } from "../_lib/push";
import { diaLocalSP_BR, weekdayPTLocalSP, horaLocalSP } from "../_lib/tempoLocal";

// Chamado por um cron EXTERNO de hora em hora (o plano Hobby da Vercel so
// permite 1 execucao de cron/dia, inviavel pra lembretes horarios — ver
// README). So pergunta "deveria disparar NESTA hora", nunca reprocessa uma
// janela perdida (sem "catch-up" de horario que passou).
function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // nunca autoriza sem o secret configurado — falha fechado
  return req.headers["authorization"] === `Bearer ${expected}`;
}

// DD/MM/AAAA local, sem importar src/lib/dates.ts (fronteira api//src/ sem
// import cruzado) — reimplementacao minima so pro que este arquivo precisa.
function parseDataBR(s: string): Date {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}
function diasEntre(a: string, b: string): number {
  return Math.round((parseDataBR(b).getTime() - parseDataBR(a).getTime()) / 86400000);
}

// mealLog[data][mealId] pode ser um array de itens OU (formato antigo) um
// numero cru de kcal — mesma forma de src/lib/points.ts, reimplementada aqui
// so pra decidir "tem algo registrado" sem cruzar a fronteira api//src/.
function temItensRegistrados(v: any): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return v > 0;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const db = await getDb();
  // find({}) em todos os usuarios — ok na escala de 2 pessoas deste app.
  // Nao pagina; se o numero de contas crescer muito isso precisa mudar.
  const users = await (await db.collection<User>("users").find({})).toArray();

  const hojeBR = diaLocalSP_BR();
  const diaSemana = weekdayPTLocalSP();
  const { hh, mm } = horaLocalSP();
  const minutosAgora = hh * 60 + mm;

  let disparos = 0;
  const erros: string[] = [];

  for (const user of users) {
    try {
      const prefs = mergeNotificacoes(user.notificacoes);

      // ---- agua: 1-3x/dia nos horarios configurados ----
      if (prefs.agua.on && prefs.agua.horarios.some((h) => Number(h.split(":")[0]) === hh)) {
        const waters = ((await kvGet(`${user._id}_water`)) || []) as { date: string; liters: number }[];
        const entradaHoje = waters.find((w) => w.date === hojeBR);
        const jaBateuMeta = !!entradaHoje && entradaHoje.liters >= user.waterMeta;
        if (!jaBateuMeta) {
          const r = await sendToUser(user._id, {
            tipo: "agua",
            title: "Hora de beber água 💧",
            body: `Ainda não bateu sua meta de ${user.waterMeta}L hoje.`,
            url: "/",
          });
          if (r.sent > 0) disparos++;
        }
      }

      // ---- treino: 1x/dia no horario configurado, so se ha treino programado hoje ----
      if (prefs.treino.on && Number(prefs.treino.horario.split(":")[0]) === hh) {
        const treino = ((await kvGet(`${user._id}_treino`)) || []) as { dia: string }[];
        const temTreinoHoje = treino.some((t) => t.dia === diaSemana);
        if (temTreinoHoje) {
          const checks = ((await kvGet(`${user._id}_check`)) || []) as { date: string; status: string }[];
          const checkHoje = checks.find((c) => c.date === hojeBR);
          const jaTreinou = !!checkHoje && (checkHoje.status === "completo" || checkHoje.status === "parcial");
          if (!jaTreinou) {
            const r = await sendToUser(user._id, {
              tipo: "treino",
              title: "Hora do treino 🏋️",
              body: "Seu treino de hoje está te esperando.",
              url: "/",
            });
            if (r.sent > 0) disparos++;
          }
        }
      }

      // ---- refeicao (off por padrao): por refeicao configurada, >=60min atrasada e sem registro ----
      if (prefs.refeicao.on) {
        const cfg = ((await kvGet(`${user._id}_refeicoes_cfg`)) || null) as { id: string; nome: string; horario: string }[] | null;
        if (cfg && cfg.length) {
          const log = ((await kvGet(`${user._id}_refeicoes_log`)) || {}) as Record<string, Record<string, any>>;
          const logHoje = log[hojeBR] || {};
          for (const refeicao of cfg) {
            const [rh, rm] = (refeicao.horario || "00:00").split(":").map(Number);
            const minutosRefeicao = rh * 60 + (rm || 0);
            const atrasoMin = minutosAgora - minutosRefeicao;
            if (atrasoMin >= 60 && !temItensRegistrados(logHoje[refeicao.id])) {
              const r = await sendToUser(user._id, {
                tipo: "refeicao",
                title: "Refeição pendente 🍽️",
                body: `Você ainda não registrou ${refeicao.nome}.`,
                url: "/",
              });
              if (r.sent > 0) disparos++;
            }
          }
        }
      }

      // ---- pesagem (off por padrao): fixo segunda 08h SP, so se ha mais de 7 dias sem medicao ----
      if (prefs.pesagem.on && diaSemana === "Segunda" && hh === 8) {
        const historico = ((await kvGet(`${user._id}_bc_historico`)) || []) as { id: number; date: string }[];
        const ultima = historico.length ? historico[0] : null;
        const diasDesde = ultima ? diasEntre(ultima.date, hojeBR) : Infinity;
        if (diasDesde > 7) {
          const r = await sendToUser(user._id, {
            tipo: "pesagem",
            title: "Hora da pesagem semanal ⚖️",
            body: "Já faz mais de uma semana desde sua última medição.",
            url: "/",
          });
          if (r.sent > 0) disparos++;
        }
      }
    } catch (err) {
      console.error(`[cron/reminders] falha pro usuario ${user._id}:`, err);
      erros.push(String(user._id));
    }
  }

  res.status(200).json({ ok: true, usuarios: users.length, disparos, erros });
}
