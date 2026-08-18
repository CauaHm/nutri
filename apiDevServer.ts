import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

// Tipagem propria (nao a de api/_lib/types.ts — aquele arquivo pertence ao
// projeto TS de api/, com compilerOptions diferentes; misturar os dois em
// projetos composite separados da conflito). A forma e a mesma, so nao
// compartilha o arquivo.
type DevVercelRequest = IncomingMessage & { query: Record<string, string>; cookies: Record<string, string>; body: any };
type DevVercelResponse = ServerResponse & { status(code: number): DevVercelResponse; json(body: any): DevVercelResponse; send(body: any): DevVercelResponse };

// `vite dev` so serve o frontend — ele nao sabe que `api/` e uma pasta de
// funcoes serverless (isso e convencao so da Vercel). Sem isso, um fetch
// pra `/api/...` cai no serve-estatico do Vite e volta o CODIGO-FONTE do
// handler como se fosse JS pro browser, quebrando qualquer chamada. Este
// plugin intercepta `/api/*` antes do resto do Vite e roda os handlers de
// verdade (via ssrLoadModule, que transpila TS igual ao resto do projeto),
// simulando o req/res que a Vercel entrega em producao. So existe durante
// `vite dev` — `vite build`/deploy na Vercel nunca executam este arquivo.

// .env.local tem prioridade (convencao Vite) mas aceita .env tambem, ja
// que e o nome que este projeto vem usando. Sem nenhum dos dois, os
// modulos de dados (api/_lib/db.ts, store.ts) caem pro fallback em
// arquivo JSON, igual em qualquer outro dev sem banco.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // tenta o proximo
  }
}

const ROUTES: Array<{ re: RegExp; file: string; param?: string }> = [
  { re: /^\/api\/auth\/([^/]+)\/?$/, file: "/api/auth/[action].ts", param: "action" },
  { re: /^\/api\/competition\/?$/, file: "/api/competition.ts" },
  { re: /^\/api\/cron\/reminders\/?$/, file: "/api/cron/reminders.ts" },
  { re: /^\/api\/food\/analyze\/?$/, file: "/api/food/analyze.ts" },
  { re: /^\/api\/invites\/?$/, file: "/api/invites/index.ts" },
  { re: /^\/api\/invites\/([^/]+)\/respond\/?$/, file: "/api/invites/[id]/respond.ts", param: "id" },
  { re: /^\/api\/kv\/many\/?$/, file: "/api/kv/many.ts" },
  { re: /^\/api\/kv\/([^/]+)\/?$/, file: "/api/kv/[key].ts", param: "key" },
  { re: /^\/api\/push\/([^/]+)\/?$/, file: "/api/push/[action].ts", param: "action" },
];

function matchRoute(pathname: string): { file: string; params: Record<string, string> } | null {
  for (const r of ROUTES) {
    const m = r.re.exec(pathname);
    if (m) return { file: r.file, params: r.param ? { [r.param]: decodeURIComponent(m[1]) } : {} };
  }
  return null;
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function apiDevServer(): Plugin {
  return {
    name: "api-dev-server",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const url = new URL(req.url, "http://localhost");
        const match = matchRoute(url.pathname);
        if (!match) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "not_found" }));
          return;
        }

        try {
          const mod = await server.ssrLoadModule(match.file);
          const handler = mod.default as (req: DevVercelRequest, res: DevVercelResponse) => Promise<void> | void;

          const query: Record<string, string> = { ...match.params };
          url.searchParams.forEach((v, k) => { query[k] = v; });

          const method = req.method || "GET";
          const body = method === "GET" || method === "HEAD" ? undefined : await readJsonBody(req);

          const vreq = req as unknown as DevVercelRequest;
          vreq.query = query;
          vreq.cookies = parseCookies(req.headers.cookie);
          vreq.body = body;

          const vres = res as unknown as DevVercelResponse;
          vres.status = (code: number) => { res.statusCode = code; return vres; };
          vres.json = (payload: any) => {
            if (!res.headersSent) res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
            return vres;
          };
          vres.send = (payload: any) => { res.end(payload); return vres; };

          await handler(vreq, vres);
        } catch (err) {
          console.error(`[api-dev-server] ${url.pathname}:`, err);
          if (!(res as ServerResponse).headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "dev_server_error", message: err instanceof Error ? err.message : String(err) }));
          }
        }
      });
    },
  };
}
