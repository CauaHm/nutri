import { getDb } from "./db";
import type { User } from "./repo";

// Grava um treino pronto na conta de alguem, na mesma chave kv
// `${userId}_treino` que o app le (store.ts / src/lib/useAppData.ts).
// Usado pela rota protegida api/admin/seed-treino.ts e escrito como funcao
// separada porque a rota so cuida de autorizacao/HTTP — a decisao de "qual
// conta" e "sobrescreve ou nao" mora aqui.

export interface SeedResultado {
  ok: boolean;
  erro?: string;
  candidatos?: string[];
  conta?: { _id: string; nome: string; email: string };
  chave?: string;
  dias?: number;
  exercicios?: number;
  tinhaTreino?: number | null;
  backupKey?: string;
  gravado: boolean;
}

// Sem email exato, procura por qualquer conta cujo e-mail contenha o trecho
// (case-insensitive). E-mail no banco ja vem normalizado em minusculo por
// norm() em repo.ts, mas a busca insensivel nao custa nada.
//
// O filtro e feito em JS depois de um find({}) em vez de um $regex no banco
// de proposito: o fallback em arquivo do db.ts so entende $in, entao um
// $regex passaria batido la e a rota nunca acharia ninguem em dev. find({})
// em todas as contas segue o mesmo precedente de api/cron/reminders.ts —
// ok na escala de duas pessoas deste app.
export type ContaEncontrada =
  | { ok: true; user: User }
  | { ok: false; erro: "conta_nao_encontrada" }
  | { ok: false; erro: "varias_contas"; candidatos: string[] };

// Acha a conta por e-mail exato ou, na falta dele, por um trecho do e-mail.
// Compartilhado pelas rotas administrativas pra que "qual conta e essa" seja
// respondido do mesmo jeito em todas.
export async function acharConta(opts: { email?: string; busca: string }): Promise<ContaEncontrada> {
  const db = await getDb();
  const todos = await (await db.collection<User>("users").find({})).toArray();

  const alvo = opts.email?.trim().toLowerCase();
  const busca = opts.busca.toLowerCase();
  const encontrados = todos.filter((u) =>
    alvo ? String(u.email).toLowerCase() === alvo : String(u.email).toLowerCase().includes(busca),
  );

  if (encontrados.length === 0) return { ok: false, erro: "conta_nao_encontrada" };
  // Nunca chuta qual conta e quando mais de uma bate — quem chamou escolhe
  // passando o e-mail exato.
  if (encontrados.length > 1) return { ok: false, erro: "varias_contas", candidatos: encontrados.map((u) => u.email) };
  return { ok: true, user: encontrados[0] };
}

export async function seedTreino(opts: {
  treino: unknown[];
  email?: string;
  busca: string;
  confirmar: boolean;
}): Promise<SeedResultado> {
  const conta = await acharConta(opts);
  if (!conta.ok) {
    return { ok: false, erro: conta.erro, candidatos: conta.erro === "varias_contas" ? conta.candidatos : undefined, gravado: false };
  }

  const db = await getDb();
  const user = conta.user;
  const chave = `${user._id}_treino`;
  const kv = db.collection<{ _id: string; value: any }>("kv");
  const atual = await kv.findOne({ _id: chave });

  const base: SeedResultado = {
    ok: true,
    conta: { _id: user._id, nome: user.nome, email: user.email },
    chave,
    dias: opts.treino.length,
    exercicios: opts.treino.reduce((n: number, d: any) => n + (d.exercicios?.length || 0), 0),
    tinhaTreino: Array.isArray(atual?.value) ? atual.value.length : null,
    gravado: false,
  };

  // Padrao e NAO gravar: a rota e aberta no navegador, entao uma visita sem
  // ?confirm=1 (ou um prefetch do browser) so mostra o que aconteceria.
  if (!opts.confirmar) return base;

  // Backup do treino anterior numa chave irma antes de sobrescrever. Fica sob
  // o mesmo prefixo `${userId}_`, entao continua sendo dado da conta dela
  // (canReadKey/canWriteKey em authSession.ts) e nao aparece em tela nenhuma.
  let backupKey: string | undefined;
  if (atual) {
    backupKey = `${user._id}_treino_backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await kv.insertOne({ _id: backupKey, value: atual.value });
  }

  if (atual) {
    await kv.updateOne({ _id: chave }, { $set: { value: opts.treino } });
  } else {
    await kv.insertOne({ _id: chave, value: opts.treino });
  }

  return { ...base, backupKey, gravado: true };
}
