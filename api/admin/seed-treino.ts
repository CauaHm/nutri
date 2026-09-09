import type { VercelRequest, VercelResponse } from "../_lib/types";
import { autorizado } from "../_lib/adminAuth";
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
// rota responde 404 e nunca toca no banco — ver api/_lib/adminAuth.ts.

const BUSCA_PADRAO = "rhebecca";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autorizado(req, res)) return;

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
