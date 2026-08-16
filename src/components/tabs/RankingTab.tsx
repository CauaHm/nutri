import { useState } from "react";
import { IconUserPlus, IconInbox, IconCheck } from "@/components/icons";
import { CARD, CARD2, PURP, PINK, AMB, GRN, RED, SUB, BORDER, TEXT, sInp, sBtn, sCard } from "@/lib/theme";
import type { TabProps } from "@/lib/screenProps";
import type { AppData } from "@/lib/useAppData";

function ConvidarParceiro({ data }: { data: AppData }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const enviar = async () => {
    if (!email.trim()) return;
    const r = await data.enviarConvite(email.trim());
    setStatus(r.ok ? "enviado" : r.error === "email_invalido" ? "email invalido" : "não deu pra enviar");
    if (r.ok) setEmail("");
  };

  return (
    <div style={{ ...sCard, marginBottom: 14, padding: 16, textAlign: "center" }}>
      <IconUserPlus size={30} style={{ color: PURP, marginBottom: 8 }} />
      <div style={{ fontWeight: 800, fontSize: 15, color: TEXT, marginBottom: 4 }}>Convide alguém pra competir</div>
      <div style={{ fontSize: 12, color: SUB, marginBottom: 14, lineHeight: 1.5 }}>
        Chame seu parceiro de treino — vocês acompanham o progresso um do outro e competem por pontos.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={sInp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email da pessoa" onKeyDown={(e) => e.key === "Enter" && enviar()} />
        <button style={sBtn(PURP)} onClick={enviar}>Convidar</button>
      </div>
      {status && <div style={{ fontSize: 11, color: status === "enviado" ? GRN : RED, marginTop: 8 }}>{status === "enviado" ? "Convite enviado! Quando essa pessoa entrar com esse e-mail, vai ver o convite." : status}</div>}

      {data.invitesRecebidos.length > 0 && (
        <div style={{ marginTop: 16, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
            <IconInbox size={15} /> Convites recebidos
          </div>
          {data.invitesRecebidos.map((inv) => (
            <div key={inv._id} style={{ background: CARD2, borderRadius: 10, padding: "10px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: TEXT }}><b>{inv.fromNome}</b> te chamou pra competir</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="tapable" onClick={() => data.responderConvite(inv._id, "accept")} style={{ background: GRN, border: "none", borderRadius: 7, width: 28, height: 28, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconCheck size={14} /></button>
                <button className="tapable" onClick={() => data.responderConvite(inv._id, "decline")} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, width: 28, height: 28, color: SUB, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RankingTab({ data }: TabProps) {
  const { userId, outroId, user, outroUser, myStats, outroStats, config, historico, recados, sendRecado, temParceiro, sairCompeticao } = data;
  const [msg, setMsg] = useState("");

  if (!temParceiro || !outroUser || !myStats || !outroStats) return <ConvidarParceiro data={data} />;

  const rows = [
    { uid: userId, stats: myStats, u: user },
    { uid: outroId, stats: outroStats, u: outroUser },
  ];

  const ultimoRecadoParaMim = recados.find((r) => r.to === userId);

  return (
    <>
      <div style={{ fontSize: 11, color: SUB, marginBottom: 14, lineHeight: 1.6 }}>
        🎯 Meta: <span style={{ color: PINK, fontWeight: 700 }}>{config.metaPontos} pts</span> para ganhar · kcal✅=1pt · água✅=1pt · treino completo=3pts · parcial=1pt
      </div>

      {rows.map(({ uid, stats, u }) => (
        <div key={uid} style={{ background: CARD, borderRadius: 12, border: `2px solid ${u.cor}40`, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ background: `${u.cor}15`, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 28 }}>{u.emoji}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: u.cor }}>{u.nome}</div>
                <div style={{ fontSize: 11, color: SUB }}>Rodada atual</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 28, color: u.cor }}>{stats.pts}</div>
              <div style={{ fontSize: 10, color: SUB }}>/ {config.metaPontos} pts</div>
            </div>
          </div>
          <div style={{ padding: "10px 14px" }}>
            <div style={{ background: "#ffffff15", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${Math.min((stats.pts / config.metaPontos) * 100, 100)}%`, height: "100%", background: `linear-gradient(90deg,${u.cor},${PURP})`, borderRadius: 8 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {([["🔥 Kcal", stats.calDays], ["💧 Água", stats.waterDays], ["🏋️ Treino", stats.checkDays]] as const).map(([l, d]) => (
                <div key={l} style={{ background: CARD2, borderRadius: 8, padding: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: SUB }}>{l}</div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: u.cor }}>{stats.totalDias > 0 ? Math.round((d / stats.totalDias) * 100) : 0}%</div>
                  <div style={{ fontSize: 9, color: SUB }}>{d}/{stats.totalDias} dias</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: outroUser.cor }}>💌 Recado pra {outroUser.nome}</div>
        {ultimoRecadoParaMim && (
          <div style={{ margin: "0 14px 10px", padding: "8px 10px", background: `${user.cor}12`, borderLeft: `2px solid ${user.cor}`, borderRadius: "0 8px 8px 0", fontSize: 12 }}>
            <div style={{ color: SUB, fontSize: 10, marginBottom: 2 }}>{outroUser.nome} disse ({ultimoRecadoParaMim.date}):</div>
            "{ultimoRecadoParaMim.text}"
          </div>
        )}
        <div style={{ padding: "0 14px 14px", display: "flex", gap: 8 }}>
          <input style={sInp} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={`Manda um incentivo pro ${outroUser.nome}...`} onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) { sendRecado(msg.trim()); setMsg(""); } }} />
          <button style={sBtn(user.cor)} onClick={() => { if (msg.trim()) { sendRecado(msg.trim()); setMsg(""); } }}>Enviar</button>
        </div>
      </div>

      {historico.length > 0 && (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: AMB }}>🏅 Histórico de Rodadas</div>
          {historico.map((h, i) => {
            const vencedor = h.winner === userId ? user : h.winner === outroId ? outroUser : null;
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderTop: `1px solid ${BORDER}`, fontSize: 12 }}>
                <span>{vencedor?.emoji} <span style={{ color: vencedor?.cor, fontWeight: 700 }}>{vencedor?.nome || "—"}</span> venceu</span>
                <span style={{ color: SUB }}>{h.date}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => { if (confirm(`Sair da competição com ${outroUser.nome}? O histórico dessa rodada some.`)) sairCompeticao(); }} style={{ background: "none", border: "none", color: SUB, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
        Sair da competição
      </button>
    </>
  );
}
