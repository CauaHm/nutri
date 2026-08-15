"use client";
import { useState, useEffect, useCallback } from "react";

// Convites e competicao (a dupla) — substitui o par fixo Cauã/Rhebecca por
// um convite real entre duas contas. Sem servico de email: o convite so
// aparece pra pessoa quando ela loga com o mesmo e-mail que foi convidado.
export function useCompetition(userId) {
  const [competition, setCompetition] = useState(null);
  const [partner, setPartner] = useState(null);
  const [invitesRecebidos, setInvitesRecebidos] = useState([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [compRes, invRes] = await Promise.all([
      fetch("/api/competition", { cache: "no-store" }),
      fetch("/api/invites", { cache: "no-store" }),
    ]);
    if (compRes.ok) {
      const body = await compRes.json();
      setCompetition(body.competition);
      setPartner(body.partner);
    }
    if (invRes.ok) {
      const body = await invRes.json();
      setInvitesRecebidos(body.recebidos || []);
    }
    setReady(true);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const enviarConvite = async (toEmail) => {
    const r = await fetch("/api/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toEmail }) });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, ...body };
  };

  const responderConvite = async (id, action) => {
    const r = await fetch(`/api/invites/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    await refresh();
    return r.ok;
  };

  const sairCompeticao = async () => {
    await fetch("/api/competition", { method: "DELETE" });
    await refresh();
  };

  const salvarCompeticao = async (patch) => {
    const r = await fetch("/api/competition", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (r.ok) {
      const { competition } = await r.json();
      setCompetition(competition);
    }
  };

  return { ready, competition, partner, invitesRecebidos, refresh, enviarConvite, responderConvite, sairCompeticao, salvarCompeticao };
}
