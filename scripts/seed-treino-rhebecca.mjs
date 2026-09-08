// Grava o treino da semana da Rhebecca (scripts/treino-rhebecca.mjs) na conta
// dela, direto no banco — a mesma chave kv `${userId}_treino` que o app usa
// (api/_lib/store.ts, colecao "kv", documentos { _id: key, value }).
//
//   node scripts/seed-treino-rhebecca.mjs --dry-run     # so mostra o que faria
//   node scripts/seed-treino-rhebecca.mjs               # grava de verdade
//   node scripts/seed-treino-rhebecca.mjs --email=x@y.z # conta explicita
//
// Precisa de MONGODB_URI (.env.local ou .env, mesma convencao do
// apiDevServer.ts). Sem ela o script para: o fallback em arquivo JSON de
// api/_lib/db.ts e so pra dev e gravar la nao mudaria nada em producao.

import { MongoClient } from "mongodb";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // tenta o proximo
  }
}

const { TREINO_RHEBECCA } = await import("./treino-rhebecca.mjs");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const emailArg = args.find((a) => a.startsWith("--email="))?.slice("--email=".length);
const BUSCA_PADRAO = "rhebecca";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI nao configurada — crie .env.local com a connection string do Atlas (ver README).");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main(db) {
  // Sem --email, procura por qualquer conta cujo e-mail contenha "rhebecca"
  // (case-insensitive). E-mail no banco ja vem normalizado em minusculo por
  // norm() em api/_lib/repo.ts, mas a busca insensivel nao custa nada.
  // Filtra em JS depois de um find({}), a mesma selecao de
  // api/_lib/seedTreino.ts — os dois caminhos tem que escolher a mesma conta.
  const todos = await db.collection("users").find({}).toArray();
  const alvo = emailArg?.trim().toLowerCase();
  const encontrados = todos.filter((u) =>
    alvo ? String(u.email).toLowerCase() === alvo : String(u.email).toLowerCase().includes(BUSCA_PADRAO),
  );

  if (encontrados.length === 0) {
    console.error(`Nenhuma conta com e-mail ${emailArg ? `= "${emailArg}"` : `contendo "${BUSCA_PADRAO}"`}.`);
    console.error("Rode de novo com --email=oemaildela@exemplo.com pra apontar a conta na mao.");
    return 1;
  }
  if (encontrados.length > 1) {
    console.error(`${encontrados.length} contas batem com "${BUSCA_PADRAO}" — nao da pra adivinhar qual e:`);
    for (const u of encontrados) console.error(`  - ${u.email} (${u.nome})`);
    console.error("Rode de novo com --email=... escolhendo uma.");
    return 1;
  }

  const user = encontrados[0];
  const chave = `${user._id}_treino`;
  const kv = db.collection("kv");
  const atual = await kv.findOne({ _id: chave });

  const totalEx = TREINO_RHEBECCA.reduce((n, d) => n + d.exercicios.length, 0);
  console.log(`Conta: ${user.nome} <${user.email}> (_id ${user._id})`);
  console.log(`Chave: ${chave}`);
  console.log(`Treino novo: ${TREINO_RHEBECCA.length} dias, ${totalEx} exercícios`);
  for (const d of TREINO_RHEBECCA) {
    console.log(`  ${d.emoji} ${d.dia.padEnd(8)} ${d.tag.padEnd(20)} ${d.isCardio ? d.cardio : `${d.exercicios.length} exercícios`}`);
  }

  if (Array.isArray(atual?.value)) {
    console.log(`Já existia um treino salvo (${atual.value.length} dias) — vai ser SOBRESCRITO.`);
  }

  if (dryRun) {
    console.log("--dry-run: nada foi gravado.");
    return 0;
  }

  // Backup do treino anterior numa chave irma antes de sobrescrever. Fica sob
  // o mesmo prefixo `${userId}_`, entao continua sendo um dado da conta dela
  // (canReadKey/canWriteKey em api/_lib/authSession.ts) e nao aparece em
  // lugar nenhum do app — e so uma copia de seguranca.
  if (atual) {
    const backupKey = `${user._id}_treino_backup_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await kv.insertOne({ _id: backupKey, value: atual.value });
    console.log(`Backup do treino anterior em ${backupKey}`);
  }

  await kv.updateOne({ _id: chave }, { $set: { value: TREINO_RHEBECCA } }, { upsert: true });
  console.log("Treino gravado.");
  return 0;
}

let codigo = 1;
try {
  await client.connect();
  codigo = await main(client.db());
} finally {
  await client.close();
}
process.exit(codigo);
