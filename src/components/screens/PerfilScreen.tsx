import { useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import { IconLogOut, IconChevronRight, IconUserPlus, IconFlame, IconDroplet, IconActivity, IconBell } from "@/components/icons";
import { CARD2, SUB, BORDER, TEXT, PURP, PINK, CYAN, AMB, RED, COR_PALETTE, sCard, sInp, sLbl, sBtn } from "@/lib/theme";
import { useOfflineQueueSnapshot } from "@/lib/useOfflineQueueSnapshot";
import type { ScreenProps } from "@/lib/screenProps";

export default function PerfilScreen({ data, nav, auth }: ScreenProps) {
  const { user, temParceiro, outroUser, sairCompeticao } = data;
  const queue = useOfflineQueueSnapshot();
  const [temp, setTemp] = useState({
    nome: user.nome, emoji: user.emoji, cor: user.cor, sexo: user.sexo || "M",
    altura: user.altura || "", idade: user.idade || "",
  });
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof temp, v: string) => setTemp((p) => ({ ...p, [k]: v } as typeof temp));

  const salvar = async () => {
    await auth.updateProfile(temp);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 100 }}>
      <ScreenHeader title="Perfil" subtitle={user.email} />
      <div style={{ padding: 14 }}>
        <div style={{ ...sCard, border: `2px solid ${temp.cor}40`, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ background: `${temp.cor}15`, padding: "14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${temp.cor}25`, border: `1.5px solid ${temp.cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{temp.emoji}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: temp.cor }}>{temp.nome}</div>
              <div style={{ fontSize: 11, color: SUB }}>{user.email}</div>
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
              <div><label style={sLbl}>Nome</label><input style={sInp} value={temp.nome} onChange={(e) => set("nome", e.target.value)} /></div>
              <div><label style={sLbl}>Emoji</label><input style={sInp} value={temp.emoji} onChange={(e) => set("emoji", e.target.value)} /></div>
            </div>
            <label style={sLbl}>Cor</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              {COR_PALETTE.map((c) => (
                <div key={c} onClick={() => set("cor", c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: temp.cor === c ? "2px solid #fff" : "2px solid transparent" }} />
              ))}
            </div>

            <div style={{ fontSize: 10, color: SUB, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 12, fontWeight: 700 }}>Corpo (usado nos cálculos de composição)</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {([["M", "Masculino"], ["F", "Feminino"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => set("sexo", k)} style={{ flex: 1, padding: "8px 4px", background: temp.sexo === k ? `${PURP}30` : "#ffffff08", border: `1px solid ${temp.sexo === k ? PURP : BORDER}`, borderRadius: 8, color: temp.sexo === k ? PURP : SUB, fontSize: 12, cursor: "pointer", fontWeight: temp.sexo === k ? 700 : 400 }}>{l}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div><label style={sLbl}>Altura (cm)</label><input style={sInp} type="number" value={temp.altura} onChange={(e) => set("altura", e.target.value)} /></div>
              <div><label style={sLbl}>Idade</label><input style={sInp} type="number" value={temp.idade} onChange={(e) => set("idade", e.target.value)} /></div>
            </div>

            <button style={{ ...sBtn(saved ? "#059669" : temp.cor, true), marginTop: 12 }} onClick={salvar}>{saved ? "✓ Salvo!" : "Salvar perfil"}</button>
          </div>
        </div>

        <button onClick={() => nav.push("composicao")} className="tapable" style={{ ...sCard, display: "block", width: "100%", padding: 0, marginBottom: 14, border: "none", cursor: "pointer", textAlign: "left" }}>
          <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Metas diárias</span>
            <span style={{ fontSize: 10.5, color: PURP, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>calculado automático <IconChevronRight size={13} /></span>
          </div>
          <div style={{ padding: "0 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ background: CARD2, borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
              <IconFlame size={14} style={{ color: PINK }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginTop: 3 }}>{user.kcalMeta}</div>
              <div style={{ fontSize: 8.5, color: SUB }}>kcal/dia</div>
            </div>
            <div style={{ background: CARD2, borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
              <IconDroplet size={14} style={{ color: CYAN }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginTop: 3 }}>{user.waterMeta}L</div>
              <div style={{ fontSize: 8.5, color: SUB }}>água/dia</div>
            </div>
            <div style={{ background: CARD2, borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
              <IconActivity size={14} style={{ color: PURP }} />
              <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginTop: 3 }}>{user.proteinaMeta}g</div>
              <div style={{ fontSize: 8.5, color: SUB }}>proteína/dia</div>
            </div>
          </div>
          <div style={{ padding: "0 14px 12px", fontSize: 10.5, color: SUB, lineHeight: 1.5 }}>
            Calculadas a partir do seu objetivo (perder peso, manter ou ganhar massa) em Nutrição → Composição Corporal.
          </div>
        </button>

        <div style={{ ...sCard, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: TEXT }}>Competição</div>
          {temParceiro && outroUser ? (
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 26 }}>{outroUser.emoji}</span>
                <div><div style={{ fontWeight: 700, fontSize: 13, color: outroUser.cor }}>{outroUser.nome}</div><div style={{ fontSize: 11, color: SUB }}>seu parceiro de treino</div></div>
              </div>
              <button onClick={() => { if (confirm(`Sair da competição com ${outroUser.nome}?`)) sairCompeticao(); }} style={{ background: "none", border: `1px solid ${RED}40`, borderRadius: 8, color: RED, fontSize: 12, padding: "8px 12px", cursor: "pointer", width: "100%" }}>Sair da competição</button>
            </div>
          ) : (
            <button onClick={() => nav.goTo("inicio", "ranking")} className="tapable" style={{ width: "100%", padding: 14, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <IconUserPlus size={18} style={{ color: PURP }} />
              <span style={{ flex: 1, fontSize: 12, color: SUB }}>Você ainda não tem parceiro — toque pra convidar alguém</span>
              <IconChevronRight size={16} style={{ color: SUB }} />
            </button>
          )}
        </div>

        <button onClick={() => nav.push("notificacoes")} className="tapable" style={{ ...sCard, width: "100%", padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 10, background: "none", border: `1px solid ${BORDER}`, cursor: "pointer", textAlign: "left" }}>
          <IconBell size={18} style={{ color: PURP }} />
          <span style={{ flex: 1, fontSize: 12, color: SUB }}>Notificações — água, treino, fim de rodada...</span>
          <IconChevronRight size={16} style={{ color: SUB }} />
        </button>

        {(queue.pending > 0 || queue.problematic > 0) && (
          <div style={{ ...sCard, marginBottom: 14, padding: "10px 14px", fontSize: 11.5, color: AMB }}>
            {queue.pending} alteraç{queue.pending === 1 ? "ão" : "ões"} pendente{queue.pending === 1 ? "" : "s"} de sincronização
            {queue.problematic > 0 && <span style={{ color: RED }}>, {queue.problematic} com erro</span>}
          </div>
        )}

        <button onClick={() => auth.logout()} className="tapable" style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: SUB, fontSize: 12, fontWeight: 700, padding: "12px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <IconLogOut size={15} /> Sair da conta
        </button>
      </div>
    </div>
  );
}
