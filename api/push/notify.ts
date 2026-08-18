import type { VercelRequest, VercelResponse } from "../_lib/types";
import { getSessionUser } from "../_lib/authSession";
import { findCompetitionById, findUserById, getPartnerId } from "../_lib/repo";
import { sendToUser } from "../_lib/push";
import type { TipoNotificacao } from "../_lib/notificacoes";

const TIPOS_VALIDOS: TipoNotificacao[] = ["fimDeRodada", "parceiroPR", "parceiroRanking", "badge"];

// Copy dos 3 tipos de evento entre parceiros que ainda nao tem ponto de
// disparo no cliente nesta fase (opt-in, desligados por padrao — corte de
// escopo explicito). A rota ja aceita e roteia corretamente pro parceiro,
// pra uma fase futura so precisar chamar isto, sem mexer aqui.
const COPY_PARCEIRO: Record<string, { title: string; body: string }> = {
  parceiroPR: { title: "Recorde pessoal do parceiro! 💪", body: " bateu um novo recorde pessoal." },
  parceiroRanking: { title: "Você foi ultrapassado no ranking! 📈", body: " passou você no placar da rodada atual." },
  badge: { title: "Novo título desbloqueado! 🏅", body: " desbloqueou um novo título em \"O Sistema\"." },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { tipo, winnerUserId } = req.body || {};
  if (!TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ error: "tipo_invalido" });
    return;
  }

  if (tipo === "fimDeRodada") {
    if (!user.competitionId) {
      res.status(200).json({ ok: true, results: [] });
      return;
    }
    const comp = await findCompetitionById(user.competitionId);
    if (!comp) {
      res.status(200).json({ ok: true, results: [] });
      return;
    }
    // winnerUserId e so texto de copy (quem "ganhou" pro corpo da mensagem),
    // nao uma decisao de autorizacao — nivel de confianca aceitavel aqui.
    // Cai pro proprio chamador se vier ausente/invalido.
    const vencedorId = comp.memberIds.includes(String(winnerUserId)) ? String(winnerUserId) : String(user._id);
    const vencedor = await findUserById(vencedorId);
    const nomeVencedor = vencedor?.nome || "Alguém";

    // Fim de rodada e compartilhado, nao pessoal — notifica os DOIS membros.
    const results = await Promise.all(
      comp.memberIds.map((uid) =>
        sendToUser(uid, {
          tipo: "fimDeRodada",
          title: "Rodada encerrada! 🏆",
          body: `${nomeVencedor} bateu a meta e venceu a rodada. Toque pra ver o placar e começar a próxima.`,
          url: "/",
        })
      )
    );
    res.status(200).json({ ok: true, results });
    return;
  }

  // parceiroPR / parceiroRanking / badge — infra generica: notifica o
  // parceiro de competicao ativo. Sem ponto de disparo no cliente ainda.
  const partnerId = await getPartnerId(user);
  if (!partnerId) {
    res.status(200).json({ ok: true, results: [] });
    return;
  }
  const copy = COPY_PARCEIRO[tipo];
  const result = await sendToUser(partnerId, { tipo, title: copy.title, body: `${user.nome}${copy.body}`, url: "/" });
  res.status(200).json({ ok: true, results: [result] });
}
