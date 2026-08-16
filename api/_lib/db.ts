import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

// Camada de banco pra contas, convites e competicoes. Usa MongoDB de verdade
// quando MONGODB_URI esta configurada; sem isso (dev local sem banco ainda
// criado), cai pra um "mongo de mentirinha" num arquivo JSON, com a mesma
// API minima (find/findOne/insertOne/updateOne/deleteOne) — o suficiente
// pra testar cadastro/login/convite sem precisar de credenciais.

const hasMongo = !!process.env.MONGODB_URI;

export { ObjectId };

export type Doc = Record<string, any>;

export interface MinimalCollection<T = Doc> {
  findOne(query: Record<string, any>): Promise<T | null>;
  find(query?: Record<string, any>): Promise<{ toArray(): Promise<T[]> }>;
  insertOne(doc: T): Promise<{ insertedId: any }>;
  updateOne(query: Record<string, any>, update: { $set?: Record<string, any>; $unset?: Record<string, any> }): Promise<{ matchedCount: number }>;
  deleteOne(query: Record<string, any>): Promise<{ deletedCount: number }>;
}

export interface DbHandle {
  collection<T = Doc>(name: string): MinimalCollection<T>;
}

let clientPromise: Promise<MongoClient> | null = null;
function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    clientPromise = client.connect();
  }
  return clientPromise;
}

// ---- Fallback em arquivo (dev local sem Mongo) -----------------------

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mongo-fallback.json");

function readFile(): Record<string, Doc[]> {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeFile(obj: Record<string, Doc[]>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

function genId() {
  return new ObjectId().toString();
}

function matches(doc: Doc, query: Record<string, any>): boolean {
  return Object.entries(query || {}).every(([k, v]) => {
    if (v && typeof v === "object" && v.$in) return v.$in.includes(doc[k]);
    return String(doc[k]) === String(v);
  });
}

function fallbackCollection<T = Doc>(name: string): MinimalCollection<T> {
  const load = (): Doc[] => {
    const all = readFile();
    return all[name] || [];
  };
  const save = (rows: Doc[]) => {
    const all = readFile();
    all[name] = rows;
    writeFile(all);
  };
  return {
    async findOne(query) {
      const found = load().find((d) => matches(d, query));
      return (found ?? null) as T | null;
    },
    async find(query) {
      const rows = load().filter((d) => matches(d, query || {}));
      return { toArray: async () => rows as unknown as T[] };
    },
    async insertOne(doc) {
      const rows = load();
      const docAny = doc as unknown as Doc;
      const _id = docAny._id || genId();
      const withId: Doc = { ...docAny, _id };
      rows.push(withId);
      save(rows);
      return { insertedId: _id };
    },
    async updateOne(query, update) {
      const rows = load();
      const idx = rows.findIndex((d) => matches(d, query));
      if (idx === -1) return { matchedCount: 0 };
      if (update.$set) rows[idx] = { ...rows[idx], ...update.$set };
      if (update.$unset) Object.keys(update.$unset).forEach((k) => delete rows[idx][k]);
      save(rows);
      return { matchedCount: 1 };
    },
    async deleteOne(query) {
      const rows = load();
      const next = rows.filter((d) => !matches(d, query));
      save(next);
      return { deletedCount: rows.length - next.length };
    },
  };
}

export async function getDb(): Promise<DbHandle> {
  if (hasMongo) {
    const client = await getMongoClient();
    return client.db() as unknown as DbHandle;
  }
  return {
    collection: <T = Doc>(name: string) => fallbackCollection<T>(name),
  };
}

export const usingLocalFallback = !hasMongo;
