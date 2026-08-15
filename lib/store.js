import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

// Store generico chave->valor (JSON). Em producao usa o Redis (Upstash),
// que e o unico jeito de ter dados persistentes e compartilhados entre
// Cauã e Rhebecca na Vercel (funcoes serverless nao guardam nada em disco
// entre uma chamada e outra). Sem as env vars da Upstash configuradas
// (ex: rodando `npm run dev` local sem conta criada ainda), cai para um
// arquivo JSON em .data/ so pra dev nao travar.

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasRedis ? Redis.fromEnv() : null;

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function readFileStore() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeFileStore(obj) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2));
}

export async function kvGet(key) {
  if (hasRedis) return (await redis.get(key)) ?? null;
  const all = readFileStore();
  return key in all ? all[key] : null;
}

export async function kvSet(key, value) {
  if (hasRedis) {
    await redis.set(key, value);
    return;
  }
  const all = readFileStore();
  all[key] = value;
  writeFileStore(all);
}

export async function kvGetMany(keys) {
  if (hasRedis) {
    const vals = await redis.mget(...keys);
    return Object.fromEntries(keys.map((k, i) => [k, vals[i] ?? null]));
  }
  const all = readFileStore();
  return Object.fromEntries(keys.map((k) => [k, k in all ? all[k] : null]));
}

export const usingLocalFallback = !hasRedis;
