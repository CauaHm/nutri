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

let clientPromise = null;
function getMongoClient() {
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

// ---- Fallback em arquivo (dev local sem Mongo) -----------------------

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mongo-fallback.json");

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeFile(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

function genId() {
  return new ObjectId().toString();
}

function matches(doc, query) {
  return Object.entries(query || {}).every(([k, v]) => {
    if (v && typeof v === "object" && v.$in) return v.$in.includes(doc[k]);
    return String(doc[k]) === String(v);
  });
}

function fallbackCollection(name) {
  const load = () => {
    const all = readFile();
    return all[name] || [];
  };
  const save = (rows) => {
    const all = readFile();
    all[name] = rows;
    writeFile(all);
  };
  return {
    async findOne(query) {
      return load().find((d) => matches(d, query)) || null;
    },
    async find(query) {
      const rows = load().filter((d) => matches(d, query || {}));
      return { toArray: async () => rows };
    },
    async insertOne(doc) {
      const rows = load();
      const _id = doc._id || genId();
      const withId = { ...doc, _id };
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

export async function getDb() {
  if (hasMongo) {
    const client = await getMongoClient();
    return client.db();
  }
  return {
    collection: (name) => fallbackCollection(name),
  };
}

export const usingLocalFallback = !hasMongo;
