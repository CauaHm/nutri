import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionUser } from "../_lib/authSession";
import { createInvite, findInvitesForEmail } from "../_lib/repo";

// Sem servico de email configurado: o convite so aparece quando a pessoa
// convidada faz login (ou cadastro) com esse mesmo email. Nao envia nada
// por fora — e um convite "caixa de entrada dentro do app", nao email real.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  if (req.method === "GET") {
    const recebidos = await findInvitesForEmail(user.email);
    res.status(200).json({ recebidos });
    return;
  }

  if (req.method === "POST") {
    if (user.competitionId) {
      res.status(409).json({ error: "ja_em_competicao" });
      return;
    }
    const { toEmail } = req.body || {};
    const alvo = String(toEmail || "").trim().toLowerCase();
    if (!alvo || alvo === user.email) {
      res.status(400).json({ error: "email_invalido" });
      return;
    }
    const invite = await createInvite({ fromUserId: user._id, fromNome: user.nome, toEmail: alvo });
    res.status(200).json({ invite });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
}
