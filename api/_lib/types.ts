import type { IncomingMessage, ServerResponse } from "node:http";

// Tipos minimos compativeis com o runtime Node da Vercel — evitam depender
// do pacote @vercel/node so por causa desses dois nomes. @vercel/node e a
// ferramenta de build inteira da Vercel (node-file-trace, esbuild, tar...),
// entao instala-la so pra tipagem local traz uma arvore de dependencias com
// varias vulnerabilidades altas/criticas que nunca rodam de verdade (nem no
// bundle do cliente, nem no runtime da funcao — so existiriam se algo aqui
// rodasse `vercel dev`/`vercel build` localmente, o que este projeto nao
// faz). Cobre exatamente o que os handlers usam: method, query, cookies,
// body, e os helpers status/json/setHeader da resposta.

export interface VercelRequest extends IncomingMessage {
  query: { [key: string]: string | string[] | undefined };
  cookies: { [key: string]: string };
  body: any;
}

export interface VercelResponse extends ServerResponse {
  status(statusCode: number): VercelResponse;
  json(body: any): VercelResponse;
  send(body: any): VercelResponse;
}
