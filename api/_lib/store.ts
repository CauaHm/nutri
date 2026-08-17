import { getDb, usingLocalFallback } from "./db";

// Store generico chave->valor (JSON) pra dados do dia a dia (treino,
// refeicoes, agua, composicao corporal, catalogo de alimentos...).
// Usa a mesma conexao MongoDB da camada de contas (api/_lib/db.ts, colecao
// "kv", documentos {_id: key, value}) — nao depende de nenhum servico
// externo alem do Mongo que o projeto ja usa. Sem MONGODB_URI configurada
// (dev local), getDb() ja cai sozinho pro fallback em arquivo JSON.

interface KVDoc {
  _id: string;
  value: any;
}

export async function kvGet(key: string): Promise<any> {
  const db = await getDb();
  const doc = await db.collection<KVDoc>("kv").findOne({ _id: key });
  return doc ? doc.value : null;
}

export async function kvSet(key: string, value: any): Promise<void> {
  const db = await getDb();
  const kv = db.collection<KVDoc>("kv");
  const existing = await kv.findOne({ _id: key });
  if (existing) {
    await kv.updateOne({ _id: key }, { $set: { value } });
  } else {
    await kv.insertOne({ _id: key, value });
  }
}

export async function kvGetMany(keys: string[]): Promise<Record<string, any>> {
  const db = await getDb();
  const rows = await (await db.collection<KVDoc>("kv").find({ _id: { $in: keys } })).toArray();
  const byKey = new Map(rows.map((r) => [r._id, r.value]));
  return Object.fromEntries(keys.map((k) => [k, byKey.has(k) ? byKey.get(k) : null]));
}

export { usingLocalFallback };
