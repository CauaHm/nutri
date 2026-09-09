import type { VercelRequest, VercelResponse } from "../_lib/types";
import { autorizado } from "../_lib/adminAuth";
import { acharConta } from "../_lib/seedTreino";
import { kvGet } from "../_lib/store";

// Mostra o treino salvo de uma conta como uma pagina legivel — o jeito de
// conferir o que esta gravado sem terminal e sem ler JSON cru no celular.
// So le; nao escreve nada. Protegida pelo mesmo ADMIN_SECRET das outras
// rotas de api/admin (sem ele, 404).
//
//   /api/admin/ver-treino?secret=...&email=voce@exemplo.com
//   ...&formato=json   devolve o JSON cru em vez da pagina

interface SerieSalva {
  tipo?: string;
  reps?: string;
  rir?: number;
  percentual?: number;
  peso?: string;
}
interface ExercicioSalvo {
  nome?: string;
  proto?: string;
  foco?: string;
  nota?: string;
  restSeconds?: number;
  series?: SerieSalva[];
}
interface DiaSalvo {
  dia?: string;
  tag?: string;
  emoji?: string;
  isCardio?: boolean;
  cardio?: string;
  info?: string;
  exercicios?: ExercicioSalvo[];
}

// O treino e conteudo escrito pelo proprio usuario e vai pra dentro de HTML:
// escapa tudo antes de interpolar.
function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function descreveSerie(s: SerieSalva): string {
  // reps e texto livre: "8" vira "8 reps", mas "8 cada" ja se explica sozinho
  // (senao sai "8 cada reps").
  const reps = s.reps ? (/^[\d\s-]+$/.test(s.reps) ? `${esc(s.reps)} reps` : esc(s.reps)) : "";
  const partes = [reps];
  if (s.tipo === "aquecimento") partes.push(s.percentual != null ? `aquecimento ~${s.percentual}%` : "aquecimento");
  else if (s.tipo === "reserva") partes.push(s.rir != null ? `RIR ${s.rir}` : "reserva");
  else if (s.tipo === "falha") partes.push("até a falha");
  if (s.peso) partes.push(`<strong>${esc(s.peso)}kg</strong>`);
  return partes.filter(Boolean).join(" · ");
}

function paginaHtml(nome: string, email: string, treino: DiaSalvo[]): string {
  const totalEx = treino.reduce((n, d) => n + (d.exercicios?.length || 0), 0);
  const dias = treino
    .map((d) => {
      const exs = (d.exercicios || [])
        .map((ex, i) => {
          const series = (ex.series || []).map((s, j) => `<li><span class="n">${j + 1}</span> ${descreveSerie(s)}</li>`).join("");
          return `<div class="ex">
            <div class="ex-top"><span class="num">${i + 1}</span><span class="nome">${esc(ex.nome)}</span><span class="proto">${esc(ex.proto)}</span></div>
            ${ex.foco ? `<div class="foco">${esc(ex.foco)}</div>` : ""}
            ${series ? `<ol class="series">${series}</ol>` : ""}
            ${ex.nota ? `<div class="nota">${esc(ex.nota)}</div>` : ""}
          </div>`;
        })
        .join("");
      return `<section class="dia">
        <h2>${esc(d.emoji)} ${esc(d.dia)} <span class="tag">${esc(d.tag)}</span></h2>
        ${d.info ? `<div class="info">📋 ${esc(d.info)}</div>` : ""}
        ${exs || `<div class="vazio">Sem exercícios cadastrados.</div>`}
        ${d.cardio ? `<div class="cardio">🏃 ${esc(d.cardio)}</div>` : ""}
      </section>`;
    })
    .join("");

  return `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Treino de ${esc(nome)}</title>
<style>
  :root{--bg:#0d0118;--card:#160d28;--card2:#1e1035;--pink:#e040fb;--purp:#a855f7;--grn:#4ade80;--amb:#f59e0b;--text:#ede9f6;--sub:#7c6a9a;--border:#2a1a45}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:16px;max-width:760px;margin:0 auto}
  h1{font-size:19px;margin:0 0 2px}
  .quem{color:var(--sub);font-size:12px;margin-bottom:18px}
  .dia{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px}
  h2{font-size:15px;margin:0 0 8px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  .tag{color:var(--sub);font-weight:400;font-size:12.5px}
  .info{background:#a855f712;color:var(--purp);padding:7px 10px;border-radius:9px;font-size:12px;margin-bottom:10px}
  .cardio{background:#4ade8012;color:var(--grn);padding:7px 10px;border-radius:9px;font-size:12px;margin-top:10px}
  .vazio{color:var(--sub);font-size:12px;padding:6px 0}
  .ex{border-top:1px solid var(--border);padding:10px 0}
  .ex:first-of-type{border-top:none;padding-top:2px}
  .ex-top{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
  .num{color:var(--sub);font-size:11px;min-width:14px}
  .nome{font-weight:700;flex:1}
  .proto{background:var(--card2);color:var(--purp);font-size:11px;padding:2px 8px;border-radius:9px;white-space:nowrap}
  .foco{color:var(--pink);font-size:11px;margin:3px 0 0 22px}
  .series{list-style:none;margin:7px 0 0 22px;padding:0}
  .series li{color:var(--sub);font-size:12px;padding:1px 0}
  .series .n{display:inline-block;min-width:16px;color:var(--amb);font-weight:700}
  .series strong{color:var(--text)}
  .nota{color:var(--sub);font-size:11.5px;margin:6px 0 0 22px;border-left:2px solid var(--purp);padding-left:8px}
  footer{color:var(--sub);font-size:11px;margin-top:18px;text-align:center}
</style></head><body>
<h1>🏋️ Treino de ${esc(nome)}</h1>
<div class="quem">${esc(email)} · ${treino.length} dias · ${totalEx} exercícios</div>
${dias}
<footer>Somente leitura — editar é pelo app.</footer>
</body></html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!autorizado(req, res, ["GET"])) return;

  const email = typeof req.query.email === "string" ? req.query.email : undefined;
  const busca = typeof req.query.busca === "string" ? req.query.busca : "";
  if (!email && !busca) {
    res.status(400).json({ error: "informe_email", dica: "adicione &email=alguem@exemplo.com" });
    return;
  }

  const conta = await acharConta({ email, busca });
  if (!conta.ok) {
    res.status(conta.erro === "varias_contas" ? 409 : 404).json({
      error: conta.erro,
      ...(conta.erro === "varias_contas" ? { candidatos: conta.candidatos, dica: "repita com &email=... escolhendo uma" } : {}),
    });
    return;
  }

  const user = conta.user;
  const treino = (await kvGet(`${user._id}_treino`)) as DiaSalvo[] | null;
  if (!Array.isArray(treino)) {
    res.status(404).json({ error: "sem_treino", conta: { nome: user.nome, email: user.email }, dica: "essa conta ainda não tem treino salvo" });
    return;
  }

  if (req.query.formato === "json") {
    res.status(200).json({ conta: { nome: user.nome, email: user.email }, treino });
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Nunca cachear: e dado de conta atras de segredo, e muda quando a pessoa
  // edita o treino no app.
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(paginaHtml(user.nome, user.email, treino));
}
