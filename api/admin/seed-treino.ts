import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "../_lib/types";
import { seedTreino } from "../_lib/seedTreino";
import treinoRhebecca from "../_lib/treinoRhebecca.json";

// Rota administrativa de uso pontual: grava o treino da semana
// (api/_lib/treinoRhebecca.json) na conta da Rhebecca. Existe pra dar pra
// rodar a carga do celular, sem terminal — o equivalente exato do
// scripts/seed-treino-rhebecca.mjs, que continua sendo o caminho de quem
// esta no PC.
//
//   /api/admin/seed-treino?secret=...              -> so mostra o que faria
//   /api/admin/seed-treino?secret=...&confirm=1    -> grava
//   &email=...  aponta a conta na mao (quando mais de uma bate com "rhebecca")
//
// ADMIN_SECRET tem que estar configurada nas env vars da Vercel; sem ela a
// rota responde 404 e nunca toca no banco (falha fechado, mesmo espirito do
// isAuthorized de api/cron/reminders.ts).

const BUSCA_PADRAO = "rhebecca";

// Aceita o segredo no header (curl) OU na query (navegador do celular, onde
// nao da pra mandar header). Comparacao em tempo constante nos dois casos.
function segredoDaRequisicao(req: VercelRequest): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  const q = req.query.secret;
  if (typeof q === "string" && q) return q;
  return null;
}

function conferaSegredo(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  // timingSafeEqual exige o mesmo tamanho — o comprimento em si nao e
  // segredo, entao comparar antes nao vaza nada util.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const esperado = process.env.ADMIN_SECRET;
  // Sem ADMIN_SECRET configurada a rota simplesmente nao existe — 404 em vez
  // de 401 pra nao anunciar que ha uma rota administrativa aqui.
  if (!esperado) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  const recebido = segredoDaRequisicao(req);
  if (!recebido || !conferaSegredo(recebido, esperado)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const email = typeof req.query.email === "string" ? req.query.email : undefined;
  const confirmar = req.query.confirm === "1";

  const r = await seedTreino({ treino: treinoRhebecca, email, busca: BUSCA_PADRAO, confirmar });

  if (!r.ok) {
    res.status(r.erro === "varias_contas" ? 409 : 404).json({
      error: r.erro,
      ...(r.candidatos ? { candidatos: r.candidatos, dica: "repita com &email=... escolhendo uma" } : {}),
      ...(r.erro === "conta_nao_encontrada" ? { dica: `nenhuma conta com e-mail ${email ? `= "${email}"` : `contendo "${BUSCA_PADRAO}"`}` } : {}),
    });
    return;
  }

  res.status(200).json({
    ok: true,
    gravado: r.gravado,
    conta: r.conta,
    chave: r.chave,
    dias: r.dias,
    exercicios: r.exercicios,
    tinhaTreino: r.tinhaTreino,
    ...(r.backupKey ? { backupKey: r.backupKey } : {}),
    ...(r.gravado ? {} : { dica: "nada foi gravado — repita a URL com &confirm=1" }),
  });
}
