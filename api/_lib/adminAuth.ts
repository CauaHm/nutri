import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "./types";

// Autorizacao das rotas administrativas (api/admin/*). Falha fechado: sem
// ADMIN_SECRET configurada nenhuma delas existe — respondem 404 em vez de
// 401, pra nao anunciar que ha uma rota administrativa ali.

// Aceita o segredo no header (curl) OU na query (navegador de celular, onde
// nao da pra mandar header).
function segredoDaRequisicao(req: VercelRequest): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  const q = req.query.secret;
  if (typeof q === "string" && q) return q;
  return null;
}

function confere(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  // timingSafeEqual exige o mesmo tamanho — o comprimento em si nao e
  // segredo, entao comparar antes nao vaza nada util.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Devolve true quando a requisicao pode seguir. Quando devolve false, JA
// respondeu (404 ou 401) — quem chamou so precisa dar return.
export function autorizado(req: VercelRequest, res: VercelResponse, metodos: string[] = ["GET", "POST"]): boolean {
  const esperado = process.env.ADMIN_SECRET;
  if (!esperado) {
    res.status(404).json({ error: "not_found" });
    return false;
  }
  if (!metodos.includes(req.method || "")) {
    res.status(405).json({ error: "method_not_allowed" });
    return false;
  }
  const recebido = segredoDaRequisicao(req);
  if (!recebido || !confere(recebido, esperado)) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}
